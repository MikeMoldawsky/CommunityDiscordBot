const client = require("../../../logic/discord/client");
const _ = require("lodash");
const { getGuildWithActiveSpeedDateSessionOrThrow, updatedMatchMakerFieldsForGuild } = require("../../db/guild-db-manager");
const moment = require("moment");

// TODO - try and check when speed date ends.

async function startDateMatchMakerTaskForGuild(guildId, interval){
	console.log(`Match maker WAKING UP for guild ${guildId}`)
	const currentMoment = moment();
	let activeGuildBotDoc;
	try {
		activeGuildBotDoc = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e) {
		console.log(`Match maker STOP - active session not found - ${activeGuildBotDoc.guildInfo}`)
		return;
	}
	const {activeSpeedDateSession:{ matchMaker } } = activeGuildBotDoc;
	const stopMatchingMoment = moment(matchMaker.startTime).add(matchMaker.durationInSeconds, "seconds");
	if(currentMoment > stopMatchingMoment){
		await createSpeedDatesMatches(activeGuildBotDoc, true);
		console.log(`Match maker TASK COMPLETED - ${activeGuildBotDoc.guildInfo}, now: ${currentMoment}, stopMatchTime: ${stopMatchingMoment}`)
		return;
	}
	await createSpeedDatesMatches(activeGuildBotDoc, false)
	console.log(`Match maker SLEEPING for ${interval} ms - ${activeGuildBotDoc.guildInfo}...`)
	setTimeout(() => startDateMatchMakerTaskForGuild(guildId, interval), interval);
}

async function startDateMatchMakerTaskWithDelayForGuild(guildId, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds){
	console.log("Match maker START TASK WITH DELAY", {guildId, matchMakerInterval, matchMakerTaskDelay})
	// 1. Assert active session
	try {
		await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e) {
		console.log("Match maker TASK with DELAY - FAILED - active session not found", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`Match maker TASK with DELAY - FAILED - active session not found for ${guildId}, ${e}`)
	}
	// 1. Update match maker configurations
	try {
		const matchMakerStartTime = moment().toDate();
		await updatedMatchMakerFieldsForGuild(guildId, matchMakerStartTime, matchMakerDurationInSeconds);
	} catch (e) {
		console.log("Match maker TASK with DELAY - FAILED - failed to update match maker config", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`Match maker TASK with DELAY - FAILED - failed to update match maker config ${guildId}, ${e}`)
	}
	// Starting match maker task in delay to let people enter the lobby and enjoy the music
	setTimeout(() => startDateMatchMakerTaskForGuild(guildId, matchMakerInterval), matchMakerTaskDelay);
}



module.exports = {
	endSpeedDateActiveRound
}
