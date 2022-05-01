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
// const DEFAULT_LOBBY_MUSIC_URL = 'https://www.youtube.com/watch?v=Yl3t2pjDYhQ';

let audioPlayer

async function playSong(url) {
	let stream = await play.stream(url)
	let resource = createAudioResource(stream.stream, {
		inputType: stream.type
	})

	audioPlayer.play(resource);
}

function playMusic(url = DEFAULT_LOBBY_MUSIC_URL) {
	try {
		audioPlayer = createAudioPlayer();

		audioPlayer.on('error', error => {
			console.error(`audioPlayer Error: ${error.message} with resource ${error.resource.metadata.title}`);
		});

		audioPlayer.on(AudioPlayerStatus.Idle, () => {
			console.log('audioPlayer - Idle')
			// restart music
			playSong(url)
		});

		audioPlayer.on(AudioPlayerStatus.Playing, () => {
			console.log('audioPlayer - Playing')
		});

		audioPlayer.on(AudioPlayerStatus.AutoPaused, () => {
			console.log('audioPlayer - AutoPaused')
		});

		audioPlayer.on(AudioPlayerStatus.Buffering, () => {
			console.log('audioPlayer - Buffering')
		});

		audioPlayer.on(AudioPlayerStatus.Paused, () => {
			console.log('audioPlayer - Paused')
		});

		playSong(url)
	}
	catch (e) {
		console.log(`Failed to play music`, e);
		throw Error(`Failed to play music, ${e}`)
	}
}

async function connectToMusic(guildId) {
	try	{
		const { config: {voiceLobby: { music : musicConfig }},  guildInfo, activeSession: { initialization: { lobby } } } = await getGuildWithActiveSessionOrThrow(guildId);
		const guildClient = await client.guilds.fetch(guildId);
		const lobbyChannel =  await guildClient.channels.fetch(lobby.channelId);

		const connection = await joinVoiceChannel({
			channelId: lobbyChannel.id,
			guildId: lobbyChannel.guild.id,
			adapterCreator: lobbyChannel.guild.voiceAdapterCreator,
		});

		connection.on(VoiceConnectionStatus.Ready, () => {
			console.log('connectToMusic - Ready');
			connection.subscribe(audioPlayer);
		});

		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			console.log('connectToMusic - Disconnected');
			try {
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
				// Seems to be reconnecting to a new channel - ignore disconnect
			} catch (error) {
				// Seems to be a real disconnect
				await connection.destroy();
				await connectToMusic(guildId)
			}
		});

		connection.on(VoiceConnectionStatus.Connecting, () => {
			console.log('connectToMusic - Connecting');
		});

		connection.on(VoiceConnectionStatus.Destroyed, () => {
			console.log('connectToMusic - Destroyed');
		});

		connection.on(VoiceConnectionStatus.Signalling, () => {
			console.log('connectToMusic - Signalling');
		});
	}
	catch (e) {
		console.log(`Failed to connect to music for guild ${guildId}`, e);
		throw Error(`Failed to connect to music for guild ${guildId}, ${e}`)
	}
}

async function disconnectFromMusic(guildId) {
	const connection = getVoiceConnection(guildId);
	if (connection) {
		await connection.destroy()
	}
}

module.exports = {
	playMusic,
	connectToMusic,
	disconnectFromMusic,
}