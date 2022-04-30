const { createReadStream } = require('node:fs');
const { join } = require('node:path');
const {
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnectionStatus,
	AudioPlayerStatus,
	StreamType,
	getVoiceConnection,
	entersState,
} = require('@discordjs/voice');
const { getGuildWithActiveSessionOrThrow } = require("../../logic/db/guild-db-manager");
const client = require('../../logic/discord/client')

let audioPlayer

function playMusic() {
	try {
		audioPlayer = createAudioPlayer({
			// behaviors: {
			// 	noSubscriber: NoSubscriberBehavior.Pause,
			// },
		});

		const resource =  createAudioResource(
			createReadStream(join(__dirname, 'music/elevator-music.ogg'), {
				inputType: StreamType.OggOpus,
			}),
			{
				metadata: {
					title: 'Elevator Music'
				}
			}
		);

		audioPlayer.on('error', error => {
			console.error(`audioPlayer Error: ${error.message} with resource ${error.resource.metadata.title}`);
		});

		audioPlayer.on(AudioPlayerStatus.Idle, () => {
			console.log('audioPlayer - Idle')
			// restart music
			audioPlayer.play(resource);
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

		audioPlayer.play(resource);
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