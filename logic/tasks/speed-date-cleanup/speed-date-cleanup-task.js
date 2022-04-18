const {
	getGuildSpeedDateBotDocumentOrThrow,
	persistAndGetGuildSpeedDateBot
} = require("../../../logic/db/guild-db-manager");
const client = require("../../../logic/discord/client");
const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const moment = require("moment");
const { cleanUpSpeedDateForGuild } = require("./speed-date-cleanup-manager");


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
			const {speedDateStartTime, speedDateSessionConfig: {speedDateDurationMinutes} } = activeSpeedDateSession;
			const speedDateEndMoment = moment(speedDateStartTime).add(speedDateDurationMinutes, "minutes");
			const currentMoment = moment();
			if(currentMoment < speedDateEndMoment){
				console.log(`Cleanup Not ready - speed date for guild ${guildInfo} still have time until it's completed - end time ${speedDateEndMoment}`)
				setTimeout(() => startSpeedDateSessionCompleteTask(guildId, interval), interval);
				return;
			}
      await cleanUpSpeedDateForGuild(guildId);
		} catch (e) {
			console.log(`Failed to perform onComplete operations for ${guildId}`, e)
		}
}


module.exports = {
	startSpeedDateSessionCompleteTask
}
