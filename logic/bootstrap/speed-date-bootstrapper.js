const { createRoleProtectedRouterVoiceChannel } = require("../discord/discord-speed-date-manager");
const { persistAndGetGuildSpeedDateBot } = require("../db/guild-db-manager");

async function initializeSpeedDateSessionForGuild(guildSpeedDateBotDoc, guildClient, lobbyChannelClient, speedDateDurationMinutes, roomCapacity) {
	// 2. Initialize Speed Date Infrastructure - Roles, Router, DB etc...
	const {guildInfo: {guildId, guildName} } = guildSpeedDateBotDoc;
	try {
		console.log(`Initializing speed date session for guild ${guildName} with id ${guildId}`);
		// 0. Persist active session config before creating actual objects (roles, channels etc.)
		// Helps to avoid a bad state (e.g. if we crashed while creating roles but didn't persist).
		guildSpeedDateBotDoc.activeSpeedDateSession = {
			speedDateSessionConfig: {
				lobbyChannelId: lobbyChannelClient.id,
				lobbyChannelName: lobbyChannelClient.name,
				speedDateDurationMinutes: speedDateDurationMinutes,
				roomCapacity: roomCapacity
			}
		};
		guildSpeedDateBotDoc = await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed date session config update");
		// 1. Creating router voice channel
		guildSpeedDateBotDoc.activeSpeedDateSession.routerVoiceChannel = await createRoleProtectedRouterVoiceChannel(guildClient, guildId);
		return await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed router voice channel update");
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e)
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

