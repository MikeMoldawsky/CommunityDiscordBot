const {
	getGuildSpeedDateBotDocumentOrThrow,
	persistAndGetGuildSpeedDateBot
} = require("../../../logic/db/guild-db-manager");
const { getOrCreateRole } = require("../../../logic/discord/utils");
const client = require("../../../logic/discord/client");
const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const moment = require("moment");


async function cleanUpVoiceRouterAndTempRoles(routerVoiceChannel, rooms, guildClient) {
	// 2. Delete Router & Voice Channel
	const routerVoiceChannelClient = await client.channels.fetch(routerVoiceChannel.channelId);
	await routerVoiceChannelClient.delete();
	_.forEach(rooms, async ({ voiceChannelId }) => {
		const voiceChannel = await client.channels.fetch(voiceChannelId);
		voiceChannel.delete();
	});

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

async function startSpeedDateSessionCompleteTask(guildId, interval) {
		try {
			// 0. Get state from DB
			const guildSpeedDateBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
			const { activeSpeedDateSession, guildInfo, memberMeetingsHistory } = guildSpeedDateBotDoc;
			console.log(`Checking if cleanup is required for guild ${guildInfo}.`)
			if(!activeSpeedDateSession){
				console.log(`Cleanup skipped - Guild ${guildInfo} doesn't have any active speed date session.`)
				return;
			}
			const {routerVoiceChannel, dates, participants, speedDateStartTime, speedDateSessionConfig: {speedDateDurationMinutes} } = activeSpeedDateSession;
			const speedDateEndMoment = moment(speedDateStartTime).add(speedDateDurationMinutes, "minutes");
			const currentMoment = moment();
			if(currentMoment < speedDateEndMoment){
				console.log(`Cleanup Not ready - speed date for guild ${guildInfo} still have time until it's completed - end time ${speedDateEndMoment}`)
				setTimeout(() => startSpeedDateSessionCompleteTask(guildId, interval), interval);
				return;
			}
			console.log(`Starting Cleanup for guild ${guildInfo}`)
			// 1. Cleanup resources - Router Roles etc.
			const guildClient = await client.guilds.fetch(guildId);
			await cleanUpVoiceRouterAndTempRoles(routerVoiceChannel, dates, guildClient);

			// 2. Create Speed Date Completed Role & Save participants history and add participation role
			// TODO - Mike - it should probably live some place else!
			await addCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, memberMeetingsHistory);

			// 3. Save that active session is completed - i.e. delete it
			// TODO - Asaf - do this in single request
			await GuildSpeedDateBot.findOneAndUpdate({guildId}, {memberMeetingsHistory})
			guildSpeedDateBotDoc.activeSpeedDateSession = undefined;
			console.log({guildSpeedDateBotDoc: guildSpeedDateBotDoc.memberMeetingsHistory})
			await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, 'speed date completed');
		} catch (e) {
			console.log(`Failed to perform onComplete operations for ${guildId}`, e)
		}
}


module.exports = {
	startSpeedDateSessionCompleteTask
}
