const client = require("../../../logic/discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, updatedMatchMakerFieldsForGuild } = require("../../db/guild-db-manager");
const moment = require("moment");
const { terminateSpeedDateRound } = require("./speed-date-round-terminator-manager");

async function startSpeedDateRoundTerminatorTaskInternal(guildId, interval, number){
	console.log(`Speed Date Round Terminator TASK - WAKING UP`, {guildId})
	const currentMoment = moment();
	let activeGuildBotDoc;
	try {
		activeGuildBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log(`Speed Date Round Terminator - STOP - active session not found`, {guildInfo: activeGuildBotDoc.guildInfo})
		return;
	}
	const { activeSession:{ matchMaker } } = activeGuildBotDoc;
	const stopMatchingMoment = moment(matchMaker.startTime).add(matchMaker.durationInSeconds, "seconds");
	if(number === 5){
		console.log(`Speed Date Round Terminator - COMPLETED`, {guildInfo: activeGuildBotDoc.guildInfo, currentMoment, stopMatchingMoment });
		return;
	}
	await terminateSpeedDateRound(guildId)
	console.log(`Speed Date Round Terminator - SLEEPING for ${interval} ms`, {guildInfo: activeGuildBotDoc.guildInfo})
	setTimeout(() => startSpeedDateRoundTerminatorTaskInternal(guildId, interval, number + 1), interval);
}

async function startSpeedDateRoundTerminatorTask(guildId, dateTerminatorInterval){
	console.log("Speed Date Round Terminator TASK - START", {guildId, dateTerminatorInterval})
	// 1. Assert active session
	try {
		await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log("Speed Date Round Terminator TASK - FAILED - active session not found", {guildId, dateTerminatorInterval})
		throw Error(`Speed Date Round Terminator TASK - FAILED - active session not found ${guildId}, ${e}`)
	}
	await startSpeedDateRoundTerminatorTaskInternal(guildId, dateTerminatorInterval);
}



module.exports = {
	startSpeedDateRoundTerminatorTask
}
