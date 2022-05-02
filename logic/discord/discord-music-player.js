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
const { isActiveSpeedDateSession } = require("../db/guild-db-manager");

const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';
const DEFAULT_MUSIC_VOLUME = 10;

const guildIdToMusicObject = {}


async function createAudioResourceForGuild(url, adjustedVolume) {
	const stream = await play.stream(url);
	const resource = createAudioResource(stream.stream, {
		inputType: stream.type,
		inlineVolume: true,
		metadata: { url, adjustedVolume }
	});
	resource.volume.setVolume(adjustedVolume);
	return resource;
}

async function createAudioResourceAndPlay(musicConfig, adjustedVolume, url, audioPlayer, guildId) {
	const resource = await createAudioResourceForGuild(url, adjustedVolume);
	audioPlayer.play(resource);
	_.set(guildIdToMusicObject, `${guildId}.resource`, resource);
}

/*
@param adjustedVolume:
 when adjustedVolume is 1: 100% volume
 when adjustedVolume is 0.01: 1% volume

 The weired thing is that volume can be above 100%.
 It means that if you pass 1000 you'll be at 10x the maximum volume.
 */
async function updateOrCreateAudioPlayerResourceForGuildIfNeeded(guildId) {
	const audioPlayer = _.get(guildIdToMusicObject, `${guildId}.player`);
	const { config: {voiceLobby: { music : musicConfig }},  guildInfo } = await getGuildWithActiveSessionOrThrow(guildId);
	const activeResource = _.get(guildIdToMusicObject, `${guildId}.resource`);
	const url = _.get(musicConfig, "url", DEFAULT_LOBBY_MUSIC_URL);
	const volume = _.get(musicConfig, "volume", DEFAULT_MUSIC_VOLUME);
	const adjustedVolume = volume/100;
	if(!activeResource){
		console.log("Creating new Audio Resource on Audio Player - No Active Resource", { guildInfo, musicConfig, adjustedVolume });
		await createAudioResourceAndPlay(musicConfig, adjustedVolume, url, audioPlayer, guildId);
		return;
	}
	// Guild has an existing resource
	if(activeResource.ended){ // check if resource has ended
		// restart resource
		console.log("Creating new Audio Resource on Audio Player - Active Resource Ended", {guildInfo, musicConfig, adjustedVolume});
		await createAudioResourceAndPlay(musicConfig, adjustedVolume, url, audioPlayer, guildId);
		return;
	}
	// Check if resource was changed.
	const currentResourceMetadata = _.get(activeResource, "metadata");
	if(currentResourceMetadata?.url !== url){
		// TODO: should delete current audio resource
		console.log("Creating new Audio Resource on Audio Player - Music URL was changed", {guildInfo, musicConfig, adjustedVolume});
		await createAudioResourceAndPlay(musicConfig, adjustedVolume, url, audioPlayer, guildId);
		return;
	}
	// Adjust volume on the same resource if needed
	if(currentResourceMetadata?.adjustedVolume !== adjustedVolume ){
		console.log("Setting current Audio Resource to new volume", {guildInfo, musicConfig, adjustedVolume, currentResourceMetadata})
		activeResource.volume.setVolume(adjustedVolume);
		activeResource.metadata.adjustedVolume = adjustedVolume;
	} else {
		console.log("No changes in guild Audio Resource - NOOP", {guildInfo, musicConfig, adjustedVolume, currentResourceMetadata})
	}
}

function getOrCreateAudioPlayerForGuild(guildInfo) {
	const audioPlayer = _.get(guildIdToMusicObject, `${guildInfo.guildId}.player`);
	if(audioPlayer){
		console.log("Audio player already exists", {guildInfo});
		return audioPlayer;
	}
	try {
		console.log("Creating a new Audio Player", {guildInfo})
		const audioPlayer = createAudioPlayer();

		audioPlayer.on('error', error => {
			console.error(`audioPlayer Error: ${error.message} with resource ${error.resource.metadata.title}`);
		});

		audioPlayer.on(AudioPlayerStatus.Idle, async () => {
			console.log('audioPlayer - Idle - restarting song...', {guildInfo})
			// restart music
			await updateOrCreateAudioPlayerResourceForGuildIfNeeded(guildInfo.guildId);
		});

		audioPlayer.on(AudioPlayerStatus.Playing, () => {
			console.log('audioPlayer - Playing', {guildInfo})
		});

		audioPlayer.on(AudioPlayerStatus.AutoPaused, () => {
			console.log('audioPlayer - AutoPaused', {guildInfo})
		});

		audioPlayer.on(AudioPlayerStatus.Buffering, () => {
			console.log('audioPlayer - Buffering - loading song...', {guildInfo})
		});

		audioPlayer.on(AudioPlayerStatus.Paused, () => {
			console.log('audioPlayer - Paused', {guildInfo})
		});
		_.set(guildIdToMusicObject, `${guildInfo.guildId}.player`, audioPlayer);
		return audioPlayer;
	}
	catch (e) {
		console.log(`Failed to play music`, e);
		throw Error(`Failed to play music, ${e}`)
	}
}

async function reloadMusicInLobbyIfInActiveSession(guildId) {
	const isActiveSession = await isActiveSpeedDateSession(guildId);
	if(isActiveSession){
		await playMusicInLobby(guildId);
		return
	}
	console.log(`Guild is not in active session - no need to reload music - NOOP`, {guildId});
}

async function playMusicInLobby(guildId) {
	try	{
		const { config: {voiceLobby: { music : musicConfig }},  guildInfo, activeSession: { initialization: { lobby } } } = await getGuildWithActiveSessionOrThrow(guildId);
	 	const audioPlayer = getOrCreateAudioPlayerForGuild(guildInfo);
		await updateOrCreateAudioPlayerResourceForGuildIfNeeded(guildId);

		console.log("Connecting Lobby to an audio player", {guildInfo, musicConfig, lobby})
		const guildClient = await client.guilds.fetch(guildId);
		const lobbyChannel =  await guildClient.channels.fetch(lobby.channelId);

		const connection = await joinVoiceChannel({
			channelId: lobbyChannel.id,
			guildId: lobbyChannel.guild.id,
			adapterCreator: lobbyChannel.guild.voiceAdapterCreator,
		});

		connection.on(VoiceConnectionStatus.Ready, () => {
			console.log('playMusicInLobby - Ready', {guildInfo, musicConfig});
			connection.subscribe(audioPlayer);
		});

		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			console.log('playMusicInLobby - Disconnected', {guildInfo, musicConfig});
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
	reloadMusicInLobbyIfInActiveSession,
}