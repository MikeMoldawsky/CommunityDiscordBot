const { MessageEmbed, Permissions } = require("discord.js");
const { getOrCreateRole } = require("./utils");
const { getGuildWithActiveSessionOrThrow } = require("../../logic/db/guild-db-manager");
const client = require("../../logic/discord/client");
const music = require("@koenie06/discord.js-music");
const { updatedLobby } = require("../db/guild-db-manager");
const _ = require("lodash");

const DEFAULT_LOBBY_NAME = "❤️ Speed Date Lobby ❤️";
const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';

async function getOrCreateVoiceChannelProtectedByRole(guildClient, roleId, creatorId) {
	try {
		// TODO - should NOT find the router by the name but from DB through the ID
		let lobbyChannel = guildClient.channels.cache.find(c => c.name === DEFAULT_LOBBY_NAME);
		if(lobbyChannel){
			console.log(`Found existing Lobby ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}`)
			return lobbyChannel
		} else {
			console.log(`Creating Lobby ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}`)
			return await guildClient.channels.create(DEFAULT_LOBBY_NAME, {
				type: "GUILD_VOICE",
				reason: "Staging lobby for speed dating :)",
				permissionOverwrites: [
					{ id: guildClient.id, deny: ["VIEW_CHANNEL", "CONNECT", "SPEAK"] }, // deny
					{ id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] }, // allow role
					{ id: creatorId, allow: ["SPEAK"] }, // allow creator to speak
				]
			});
		}
	} catch (e) {
		console.log(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
		throw Error(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
	}
}


async function createLobbyProtectByRole(guild, guildId, creatorId) {
	try {
		console.log(`Creating Lobby for Guild ${guildId}`);
		// Create dedicated role to protect the lobby from uninvited users
		const allowedLobbyRole = await getOrCreateRole(guildId, {
			name: `speed-dating-participant`,
			reason: "Active speed-dating round participant",
			color: "GOLD"
		});
		// Create lobby channel
		const lobbyChannel = await getOrCreateVoiceChannelProtectedByRole(guild, allowedLobbyRole.id, creatorId);
		const lobby = {
			allowedRoleId: allowedLobbyRole.id,
			allowedRoleName: allowedLobbyRole.name,
			channelId: lobbyChannel.id,
			channelName: lobbyChannel.name
		}
		await updatedLobby(guildId, lobby);
		return lobbyChannel;
	} catch (e) {
		console.log(`Failed to create Lobby for Guild ${guild.id}`, e);
	}
}

async function createLobbyInvite(lobby, config) {
	try {
		console.log(`Creating Lobby invite`);
		const invite = await lobby.createInvite();
		return new MessageEmbed()
			.setColor(0x4286f4)
			.setTitle(config.title || "Your invite to the voice channel")
			.setDescription(config.description || "It's all about connections")
			.setImage(config.image)
			.setURL(invite.url);
	} catch (e) {
		console.log(`Failed to create Lobby invite`, e)
	}
}

async function createSpeedDateVoiceChannelRoom(guild, roomNumber, memberIds) {
	const permissionOverwrites = [
		{
			id: guild.id, deny: [Permissions.FLAGS.CONNECT] },
		..._.map(memberIds, id => ({ id: id, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK] })
		)
	];
	return guild.channels.create(`Room#${roomNumber}`, {
		type: "GUILD_VOICE",
		reason: "Let's connect and get to know each other :)",
		permissionOverwrites: permissionOverwrites
	})
}


async function playMusicInLobby(interaction, guildId) {
	try {
		const { config: {voiceLobby: { music : musicConfig }},  guildInfo, activeSession: { initialization: { lobby } } } = await getGuildWithActiveSessionOrThrow(guildId);
		const guildClient = await client.guilds.fetch(guildId);
		const lobbyChannel =  await guildClient.channels.fetch(lobby.channelId);
		console.log(`Staring music for guild ${guildInfo.guildName} with id ${guildId} - ${musicConfig.url}`);
		await music.play({
			interaction: interaction,
			channel: lobbyChannel,
			song: musicConfig.url || DEFAULT_LOBBY_MUSIC_URL,
		});
		await music.volume({
			interaction: interaction,
			volume: musicConfig.volume,
		});
	} catch (e) {
		console.log(`Failed to play music for guild ${guildId}`, e);
		throw Error(`Failed to play music for guild ${guildId}, ${e}`)
	}
}


module.exports = {
	createLobbyProtectByRole,
	createLobbyInvite,
	playMusicInLobby,
	createSpeedDateVoiceChannelRoom
}
