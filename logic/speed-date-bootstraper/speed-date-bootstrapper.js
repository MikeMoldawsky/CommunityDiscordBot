const { createRoleProtectedRouterVoiceChannel } = require("../discord/discord-speed-date-manager");
const { persistAndGetGuildSpeedDateBot } = require("../db/guild-db-manager");
const moment = require("moment");

async function initializeSpeedDateSessionForGuild(guildSpeedDateBotDoc, guildClient, lobbyChannelClient, speedDateDurationMinutes, roomCapacity, matchMakerStopTime, creatorId) {
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
			},
			matchMakerStopTime: matchMakerStopTime,
			speedDateStartTime: moment().toDate()
		};
		guildSpeedDateBotDoc = await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed date session config update");
		// 1. Creating router voice channel
		const {routerData, routerChannel} = await createRoleProtectedRouterVoiceChannel(guildClient, guildId, creatorId);
		guildSpeedDateBotDoc.activeSpeedDateSession.routerVoiceChannel = routerData
		await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed router voice channel update");
		return routerChannel
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e);
		throw Error(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}, ${e}`);
	}
}


module.exports = { initializeSpeedDateSessionForGuild }

