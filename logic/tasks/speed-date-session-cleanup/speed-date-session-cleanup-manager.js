const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { deleteActiveSessionForGuild, getGuildWithActiveSpeedDateSessionOrThrow } = require("../../db/guild-db-manager");
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

async function addCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, memberMeetingsHistory) {
	console.log(`Completed Speed Date Round role for ${guildInfo}`);
	const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
		name: `speed-dater`,
		reason: "You deserve a Role as you completed the meeting!",
		color: "RED"
	});
	_.forEach(participants, (meetings, userId) => {
		const m = guildClient.members.cache.get(userId);
		m.roles.add(speedDateCompletedRole.id);
		memberMeetingsHistory[userId] = [..._.get(memberMeetingsHistory, userId, []), ...meetings];
	});
}

async function cleanUpSpeedDateSessionForGuild(guildId) {
	let activeGuildSpeedDateBotDoc;
	console.log(`CleanUp speed date session - START`, {guildId});
	try {
		activeGuildSpeedDateBotDoc = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e) {
		console.log(`CleanUp speed date session - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const { activeSpeedDateSession:{ routerVoiceChannel, dates, participants} , guildInfo, memberMeetingsHistory } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)

		// 0. CleanUp Active Round in case it was forgotten
		await endSpeedDateActiveRound(guildId) // TODO: check if it's required - probably good for edge cases
		// 1. Cleanup resources - Router Roles etc.

		const guildClient = await client.guilds.fetch(guildId);
		// 2. Create Speed Date Completed Role & Save participants history and add participation role
		await addCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, memberMeetingsHistory);
		await deleteLobbyVoiceRouterAndTempRoles(routerVoiceChannel, dates, guildClient);

		// 3. Save that active session is completed - i.e. delete it
		// TODO - Asaf - do this in single request
		await GuildSpeedDateBot.findOneAndUpdate({guildId}, {memberMeetingsHistory})
		await deleteActiveSessionForGuild(guildId);
	} catch (e) {
			console.log(`CleanUp speed date session - FAILURE`, {guildId}, e);
			throw Error(`CleanUp speed date session - FAILURE, ${guildId}, ${e}`);
	}
}

module.exports = {
	cleanUpSpeedDateSessionForGuild
}
