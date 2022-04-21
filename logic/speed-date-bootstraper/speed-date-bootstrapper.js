const { createLobbyProtectByRole } = require("../discord/discord-speed-date-manager");
const { updatedLobby, getOrCreateGuildSpeedDateBotDocument } = require("../db/guild-db-manager");
const client = require("../discord/client");

async function initializeSpeedDateSessionForGuild(guildId, guildName, creatorId) {
	// 0. Initialize DB if needed
	await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
	try {
		// Creating clients
		const guildClient = await client.guilds.fetch(guildId);
		console.log(`Initializing speed date session for guild ${guildName} with id ${guildId}`);
		// 1. Initialize Speed Date Infrastructure - Lobby etc...
		return  await createLobbyProtectByRole(guildClient, guildId, creatorId);
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e);
		throw Error(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}, ${e}`);
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

