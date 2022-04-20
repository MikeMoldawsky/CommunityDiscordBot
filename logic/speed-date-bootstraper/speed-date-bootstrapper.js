const { createRoleProtectedRouterVoiceChannel } = require("../discord/discord-speed-date-manager");
const { updatedLobby } = require("../db/guild-db-manager");

async function initializeSpeedDateSessionForGuild(guildSpeedDateBotDoc, guildClient, interactionChannelId, creatorId) {
	// 1. Initialize Speed Date Infrastructure - Roles, Router, DB etc...
	const {guildInfo: {guildId, guildName} } = guildSpeedDateBotDoc;
	try {
		console.log(`Initializing speed date session for guild ${guildName} with id ${guildId}`);
		// 1. Creating router voice channel
		const {routerData, routerChannel} = await createRoleProtectedRouterVoiceChannel(guildClient, guildId, creatorId);
		await updatedLobby(guildId, routerData);
		return routerChannel
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e);
		throw Error(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}, ${e}`);
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

