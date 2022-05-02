const _ = require('lodash')
const {
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnectionStatus,
	AudioPlayerStatus,
	getVoiceConnection,
	entersState,
} = require('@discordjs/voice');
const play = require('play-dl')
const { getGuildWithActiveSessionOrThrow } = require("../../logic/db/guild-db-manager");
const client = require('../../logic/discord/client')

const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';
const DEFAULT_MUSIC_VOLUME = 10;

const guildIdToMusicObject = {}
let i = 0;


function createGuildMusicObject(guildId, musicConfig, player, resource){
	return {
		musicConfig,
		player,
		resource,
	}
}


/*
@param adjustedVolume:
 when adjustedVolume is 1: 100% volume
 when adjustedVolume is 0.01: 1% volume

 The weired thing is that volume can be above 100%.
 It means that if you pass 1000 you'll be at 10x the maximum volume.
 */
async function playSong(url, adjustedVolume) {
	console.log("Playing audit resource on an audio player", {url, volume: adjustedVolume})
	const audioPlayer = _.get(guildIdToMusicObject, url)
	if (!audioPlayer) return

	const stream = await play.stream(url)
	const resource = createAudioResource(stream.stream, {
		inputType: stream.type,
		inlineVolume: true
	})


	resource.volume.setVolume(0.01);
	audioPlayer.play(resource);
}

async function createSongPlayer(guildInfo, musicConfig) {
	try {
		const url = _.get(musicConfig, "url", DEFAULT_LOBBY_MUSIC_URL);
		const volume = _.get(musicConfig, "volume", DEFAULT_MUSIC_VOLUME);
		const adjustedVolume = volume/100;

		console.log("Creating a new Audio Player", {guildInfo, musicConfig, adjustedVolume})
		const audioPlayer = createAudioPlayer();

		audioPlayer.on('error', error => {
			i += 1;
			console.error(`audioPlayer Error: ${error.message} with resource ${error.resource.metadata.title}`);
		});

		audioPlayer.on(AudioPlayerStatus.Idle, () => {
			console.log('audioPlayer - Idle - restarting song...', {guildInfo, musicConfig, adjustedVolume})
			// restart music
			playSong(url)
		});

		audioPlayer.on(AudioPlayerStatus.Playing, () => {
			i += 1;
			console.log('audioPlayer - Playing', {guildInfo, musicConfig, adjustedVolume})
		});

		audioPlayer.on(AudioPlayerStatus.AutoPaused, () => {
			i += 1;
			console.log('audioPlayer - AutoPaused', {url,i})
		});

		audioPlayer.on(AudioPlayerStatus.Buffering, () => {
			i += 1;
			console.log('audioPlayer - Buffering - loading song...', {guildInfo, musicConfig, adjustedVolume})
		});

		audioPlayer.on(AudioPlayerStatus.Paused, () => {
			i += 1;
			console.log('audioPlayer - Paused', {guildInfo, musicConfig, adjustedVolume})
		});

		guildIdToMusicObject[url] = audioPlayer;

		await playSong(url, adjustedVolume);
	}
	catch (e) {
		console.log(`Failed to play music`, e);
		throw Error(`Failed to play music, ${e}`)
	}
}

async function playMusicInLobby(guildId) {
	try	{
		const { config: {voiceLobby: { music : musicConfig }},  guildInfo, activeSession: { initialization: { lobby } } } = await getGuildWithActiveSessionOrThrow(guildId);
		if(!guildIdToMusicObject[guildId]){
			console.log("Guild doesn't have a playing music", {musicConfig, })

		}

		const url = _.get(musicConfig, "url", DEFAULT_LOBBY_MUSIC_URL);
		const audioPlayer = _.get(guildIdToMusicObject, guildId)

		if (!audioPlayer) {
			await createSongPlayer(guildInfo, musicConfig)
			return playMusicInLobby(guildId)
		}
		console.log("Connecting Lobby to an audio player", {guildInfo, url})
		const guildClient = await client.guilds.fetch(guildId);
		const lobbyChannel =  await guildClient.channels.fetch(lobby.channelId);

		const connection = await joinVoiceChannel({
			channelId: lobbyChannel.id,
			guildId: lobbyChannel.guild.id,
			adapterCreator: lobbyChannel.guild.voiceAdapterCreator,
		});

		connection.on(VoiceConnectionStatus.Ready, () => {
			console.log('playMusicInLobby - Ready', {guildInfo, url});
			connection.subscribe(audioPlayer);
		});

		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			console.log('playMusicInLobby - Disconnected');
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			} catch (error) {
				console.log("playMusicInLobby - Disconnected exception", {error, guildInfo, musicConfig});
				// Seems to be a real disconnect
				await connection.destroy();
				await playMusicInLobby(guildId)
			}
		});

		connection.on(VoiceConnectionStatus.Connecting, () => {
			console.log('playMusicInLobby - Connecting', {guildInfo, musicConfig});
		});

		connection.on(VoiceConnectionStatus.Destroyed, () => {
			console.log('playMusicInLobby - Destroyed', {guildInfo, musicConfig});
		});

		connection.on(VoiceConnectionStatus.Signalling, () => {
			console.log('playMusicInLobby - Signalling', {guildInfo, musicConfig});
		});
	}
	catch (e) {
		console.log(`Failed to connect to music`, {e, guildId});
		throw Error(`Failed to connect to music for guild ${guildId}, ${e}`)
	}
}

async function disconnectFromLobby(guildId) {
	const connection = getVoiceConnection(guildId);
	if (connection) {
		// TODO - stop player and remove ref if custom song and no subscribers
		await connection.destroy()
	}
}

module.exports = {
	playMusicInLobby,
	disconnectFromLobby,
}