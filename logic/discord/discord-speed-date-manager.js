const { MessageEmbed, Permissions } = require("discord.js");
const { updatedLobby, getOrCreateGuildSpeedDateBotDocument } = require("../db/guild-db-manager");
const _ = require("lodash");
const { getOrCreateRole } = require("./utils");
const getRandomEmoji = require("../utils/get-random-emoji");


const DEFAULT_LOBBY_NAME = "Connecto Lobby";
const DEFAULT_ADMIN_ROLE_NAME = "connecto-admin";

async function getOrCreateCommunityBotAdminRoleAndPersistIfNeeded(guildId, guildName) {
	try {
		console.log("Get Or Create Community Bot Admin Role - Start", { guildId });
		const adminRole = await getOrCreateRole(guildId, DEFAULT_ADMIN_ROLE_NAME, "Connecto's admin role", "GOLD");
		console.log("Get Or Create Community Bot Admin Role - Success", { guildId, adminRoleId: adminRole.id, adminRoleName: adminRole.name});
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName, adminRole);
		return adminRole;
	} catch (e) {
		console.log("Get Or Create Community Bot Admin Role - Failed", {guildId, e});
		throw Error(`Get Or Create Community Bot Admin Role - Failed - guild: ${guildId}, e: ${e}`);
	}
}


async function getOrCreateVoiceChannelProtectedByRole(guildClient, adminRoleId) {
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
					{
						id: adminRoleId,
						allow: [ // allow creator to speak
							Permissions.FLAGS.VIEW_CHANNEL,
							Permissions.FLAGS.CONNECT,
							Permissions.FLAGS.SPEAK,
							Permissions.FLAGS.MUTE_MEMBERS,
							Permissions.FLAGS.MOVE_MEMBERS,
						]
					},
					{
						id: process.env.DISCORD_CLIENT_ID,
						allow: [ // Connecto permissions
							Permissions.FLAGS.VIEW_CHANNEL,
							Permissions.FLAGS.CONNECT,
							Permissions.FLAGS.SPEAK,
							Permissions.FLAGS.MUTE_MEMBERS,
							Permissions.FLAGS.MOVE_MEMBERS
						]
					},
				]
			});
		}
	} catch (e) {
		console.log(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
		throw Error(`Failed to create Lobby Voice Channel ${DEFAULT_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
	}
}

async function createLobbyProtectByRole(guildClient, guildId,  adminRole, lobbyModeratorsRole) {
	try {
		console.log("Lobby Creation - START", { guildId, adminRoleId: adminRole.id, adminRoleName: adminRole.name});
		const lobbyChannel = await getOrCreateVoiceChannelProtectedByRole(guildClient, adminRole.id);
		const lobby = {
			lobbyModeratorsRoleId: lobbyModeratorsRole.id,
			lobbyModeratorsRoleName: lobbyModeratorsRole.name,
			channelId: lobbyChannel.id,
			channelName: lobbyChannel.name
		}
		console.log(`Lobby Creation - SUCCESS`, { guildId, lobbyModeratorsRoleId: lobbyModeratorsRole.id, lobbyModeratorsRoleName: lobbyModeratorsRole.name });
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
	return guild.channels.create(`Connecto Room ${getRandomEmoji('Animals & Nature')}`, {
		type: "GUILD_VOICE",
		reason: "Let's connect and get to know each other :)",
		permissionOverwrites: permissionOverwrites
	})
}

async function moveMembersToLobby(speedDateMembers, guildClient, lobby ) {
	const guildMemberClient = guildClient.members;
	await Promise.all(
		_.map(Array.from(speedDateMembers), async userId => {
			const user = await guildMemberClient.fetch(userId);
			return user.voice.setChannel(lobby.channelId);
		})
	);
}

async function moveSpeedDatersToLobbyAndDeleteChannel(lobby, rooms, guildClient, deleteCondition) {
	try {
		const deletedVoiceChannelIds = await Promise.all(
			_.map(rooms, async (room) => {
				try {
					const dateVoiceChannel = await guildClient.channels.fetch(room.voiceChannelId);
					const members = dateVoiceChannel.members.keys();
					if (!_.isFunction(deleteCondition) || deleteCondition(room, dateVoiceChannel.members)) {
						try {
							console.log("Moving speed-daters back to lobby", {room: JSON.stringify(room), members})
							await moveMembersToLobby(members, guildClient, lobby);
						} catch (e) {
							console.log("Failed to move speed-daters back to lobby", {members, lobby}, e)
						}
						console.log("Deleting speed-daters voice channel room", {room: JSON.stringify(room)})
						dateVoiceChannel.delete();
						return room.voiceChannelId
					}
				} catch (e) {
					console.log("Cleanup Round - failed to move ROOM to lobby and delete - FAILED FATAL", {room, lobby, e})
				}
				return null
			})
		)
		return _.filter(deletedVoiceChannelIds, _.identity)
	} catch (e) {
		console.log("Cleanup Round - failed to move all ROOMS! - FAILED FATAL", {rooms, lobby, e})
		return []
	}
}

module.exports = {
	createLobbyProtectByRole,
	createLobbyInvite,
	createSpeedDateVoiceChannelRoom,
	getOrCreateCommunityBotAdminRoleAndPersistIfNeeded,
	moveSpeedDatersToLobbyAndDeleteChannel,
}
