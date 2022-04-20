const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { deleteActiveSessionForGuild, getGuildWithActiveSessionOrThrow } = require("../../db/guild-db-manager");
const client = require("../../discord/client");
const { getOrCreateRole } = require("../../discord/utils");
const { endSpeedDateActiveRound } = require("../speed-date-round-terminator/speed-date-round-terminator-manager");

async function deleteLobbyVoiceRouterAndTempRoles(routerVoiceChannel, rooms, guildClient) {
		// 2. Delete Router & Voice Channel
		const routerVoiceChannelClient = await client.channels.fetch(routerVoiceChannel.channelId);
		await routerVoiceChannelClient.delete();
		// 3. Delete temporary speed-dating role for Router
		await guildClient.roles.delete(routerVoiceChannel.allowedRoleId);
}

async function cleanUpSpeedDateSessionForGuild(guildId) {
	let activeGuildSpeedDateBotDoc;
	console.log(`CleanUp speed date session - START`, {guildId});
	try {
		activeGuildSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log(`CleanUp speed date session - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const { activeSession:{ routerVoiceChannel, dates, participants} , guildInfo, memberMeetingsHistory } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)
		// 0. CleanUp Active Round in case it was forgotten
		await endSpeedDateActiveRound(guildId) // TODO: check if it's required - probably good for edge cases
		// 1. Cleanup resources - Router Roles etc.
		const guildClient = await client.guilds.fetch(guildId);
		await deleteLobbyVoiceRouterAndTempRoles(routerVoiceChannel, dates, guildClient);
		// 3. Save that active session is completed - i.e. delete it
		await deleteActiveSessionForGuild(guildId);
	} catch (e) {
			console.log(`CleanUp speed date session - FAILURE`, {guildId}, e);
			throw Error(`CleanUp speed date session - FAILURE, ${guildId}, ${e}`);
	}
}

async function endSpeedDateSessionTask(guildId) {
	console.log(`End Speed Date Session - START`, {guildId});
	try {
		await cleanUpSpeedDateSessionForGuild(guildId);
	} catch (e) {
		console.log(`End Speed Date Session - FAILED - no active session for Guild`, {guildId}, e);
		throw Error(`End Speed Date Session - FAILED - no active session for Guild ${guildId}, ${e}`);
	}
}

module.exports = { endSpeedDateSessionTask }
