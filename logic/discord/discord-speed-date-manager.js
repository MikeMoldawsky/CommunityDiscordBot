const { MessageEmbed, Permissions } = require("discord.js");
const { updatedLobby, getOrCreateGuildSpeedDateBotDocument } = require("../db/guild-db-manager");
const _ = require("lodash");
const { getOrCreateRole } = require("./utils");

const DEFAULT_LOBBY_NAME = "🫂 Connecto Lobby 🫂️";


async function getOrCreateCommunityBotAdminRoleAndPersistIfNeeded(guildId, guildName) {
	try {
		console.log("Get Or Create Community Bot Admin Role - Start", { guildId });
		const adminRole = await getOrCreateRole(guildId, "connecto-admin", "role to admin the community-bot", "ORANGE");
		console.log("Get Or Create Community Bot Admin Role - Success", { guildId, adminRoleId: adminRole.id, adminRoleName: adminRole.name});
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName, adminRole);
		return adminRole;
	} catch (e) {
		console.log("Get Or Create Community Bot Admin Role - Failed", {guildId, e});
		throw Error(`Get Or Create Community Bot Admin Role - Failed - guild: ${guildId}, e: ${e}`);
	}
}


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
					{ id: guildClient.id, deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK] }, // deny
					{ id: roleId, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT] }, // allow role
					{ id: creatorId, allow: [ // allow creator to speak
						Permissions.FLAGS.VIEW_CHANNEL,
						Permissions.FLAGS.CONNECT,
						Permissions.FLAGS.SPEAK,
						Permissions.FLAGS.PRIORITY_SPEAKER
					] },
					{ id: process.env.DISCORD_CLIENT_ID, allow: [ // Connecto permissions
						Permissions.FLAGS.VIEW_CHANNEL,
						Permissions.FLAGS.CONNECT,
						Permissions.FLAGS.SPEAK,
						Permissions.FLAGS.MUTE_MEMBERS,
						Permissions.FLAGS.MOVE_MEMBERS
					]},
				]
			});
		}
	} catch (e) {
		console.log(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
		throw Error(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
	}
}

async function createLobbyProtectByRole(guildClient, guildId, creatorId, protectLobbyRole, keepInLobbyRole) {
	try {
		console.log("Lobby Creation - START", { guildId, creatorId, allowedRoleId: protectLobbyRole.id, allowedRoleName: protectLobbyRole.name });
		const lobbyChannel = await getOrCreateVoiceChannelProtectedByRole(guildClient, protectLobbyRole.id, creatorId);
		const lobby = {
			allowedRoleId: protectLobbyRole.id,
			allowedRoleName: protectLobbyRole.name,
			keepInLobbyRoleId: keepInLobbyRole?.id,
			keepInLobbyRoleName: keepInLobbyRole?.name,
			channelId: lobbyChannel.id,
			channelName: lobbyChannel.name
		}
		console.log(`Lobby Creation - SUCCESS`, { guildId, creatorId, allowedRoleId: protectLobbyRole.id, allowedRoleName: protectLobbyRole.name, keepInLobbyRoleId: keepInLobbyRole?.id, keepInLobbyRoleName: keepInLobbyRole?.name });
		await updatedLobby(guildId, lobby);
		return lobbyChannel;
	} catch (e) {
		console.log(`Failed to create Lobby for Guild ${guildClient.id}`, e);
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
		{ id: guild.id, deny: [Permissions.FLAGS.CONNECT] },
		{ id: process.env.DISCORD_CLIENT_ID, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.MOVE_MEMBERS] },
		..._.map(memberIds, id => ({ id: id, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK] }))
	];
	return guild.channels.create(`Connecto Room #${roomNumber}`, {
		type: "GUILD_VOICE",
		reason: "Let's connect and get to know each other :)",
		permissionOverwrites: permissionOverwrites
	})
}

module.exports = {
	createLobbyProtectByRole,
	createLobbyInvite,
	createSpeedDateVoiceChannelRoom,
	getOrCreateCommunityBotAdminRoleAndPersistIfNeeded
}
