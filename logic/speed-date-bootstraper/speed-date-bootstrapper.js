const { createLobbyProtectByRole } = require("../discord/discord-speed-date-manager");
const { updatedActiveSessionOnCompleteConfig } = require("../db/guild-db-manager");
const client = require("../discord/client");

async function initializeSpeedDateSessionForGuild(guildId, guildName, creatorId, protectLobbyRole, memberRewardRole = undefined, keepInLobbyRole = undefined) {
	try {
		// Creating clients
		const guildClient = await client.guilds.fetch(guildId);
		console.log(`Initializing speed date session`, {guildName, guildId, creatorId, protectLobbyRoleId: protectLobbyRole.id,
			protectLobbyRoleName: protectLobbyRole.name, memberRewardRoleId: memberRewardRole?.id, memberRewardRoleName: memberRewardRole?.name,
			keepInLobbyRoleId: keepInLobbyRole?.id, keepInLobbyRoleName: keepInLobbyRole?.name});
		// 1. Initialize Speed Date Infrastructure - Lobby etc...
		const lobbyChannel = await createLobbyProtectByRole(guildClient, guildId, creatorId, protectLobbyRole, keepInLobbyRole);
		await updatedActiveSessionOnCompleteConfig(guildId, memberRewardRole);
		return lobbyChannel;
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e);
		throw Error(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}, ${e}`);
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

