const { createLobbyProtectByRole } = require("../discord/discord-speed-date-manager");
const { updatedActiveSessionOnCompleteConfig } = require("../db/guild-db-manager");
const client = require("../discord/client");

async function initializeSpeedDateSessionForGuild(guildId, guildName, adminRole, lobbyModeratorsRole, rewardPlayersRole = undefined) {
	try {
		// Creating clients
		const guildClient = await client.guilds.fetch(guildId);
		console.log(`Initializing speed date session`, {guildName, guildId, lobbyModeratorsRoleId: lobbyModeratorsRole.id,
			lobbyModeratorsRoleName: lobbyModeratorsRole.name, rewardPlayersRoleId: rewardPlayersRole?.id,
			rewardPlayersRoleName: rewardPlayersRole?.name});
		// 1. Initialize Speed Date Infrastructure - Lobby etc...
		const lobbyChannel = await createLobbyProtectByRole(guildClient, guildId, adminRole, lobbyModeratorsRole);
		await updatedActiveSessionOnCompleteConfig(guildId, rewardPlayersRole);
		return lobbyChannel;
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e);
		throw Error(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}, ${e}`);
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

