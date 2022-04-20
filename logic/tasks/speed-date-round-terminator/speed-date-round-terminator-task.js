const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow } = require("../../db/guild-db-manager");
const moment = require("moment");
const { terminateSpeedDateRound } = require("./speed-date-round-terminator-manager");

async function startSpeedDateRoundTerminatorTaskInternal(guildId, interval){
	console.log(`Speed Date Round Terminator TASK - WAKING UP`, {guildId})
	let activeGuildBotDoc;
	try {
		activeGuildBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log(`Speed Date Round Terminator Task - STOP - active session not found`, {guildInfo: activeGuildBotDoc.guildInfo})
		return;
	}
	const { activeSession:{ round: { config } } } = activeGuildBotDoc;
	const terminateRoundMoment = moment(config.startTime).add(config.durationInMinutes, "minutes");
	const currentMoment = moment();
	if(currentMoment > terminateRoundMoment){
		console.log(`Speed Date Round Terminator Task - END SPEED DATE - STARTING... `, {guildInfo: activeGuildBotDoc.guildInfo, roundStartTime: config.startTime, currentMoment, terminateRoundMoment });
		await terminateSpeedDateRound(guildId)
		console.log(`Speed Date Round Terminator Task - END SPEED DATE - SUCCESS. `, {guildInfo: activeGuildBotDoc.guildInfo});
		return;
	}
	console.log(`Speed Date Round Terminator Task - SLEEPING...`, {guildInfo: activeGuildBotDoc.guildInfo, intervalMs: interval})
	setTimeout(() => startSpeedDateRoundTerminatorTaskInternal(guildId, interval), interval);
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
