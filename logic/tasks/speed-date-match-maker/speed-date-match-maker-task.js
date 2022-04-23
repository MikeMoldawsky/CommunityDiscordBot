const client = require('../../discord/client')
const GuildSpeedDateBot = require('../../db/models/GuildSpeedDateBot')
const matchRooms = require('./speed-date-match-maker-manager')
const {createVoiceChannel} = require('../../vcShuffle')
const _ = require('lodash')
const { getGuildWithActiveSessionOrThrow, updatedMatchMakerFieldsForGuild } = require("../../db/guild-db-manager");
const moment = require("moment");

async function createSpeedDatesMatchesInternal(guildBotDoc, forceMatch = false) {
	console.log(`Match maker - SEARCHING DATES - ${guildBotDoc.guildInfo}, forceMatch ${forceMatch}`)
	const {
		activeSession: {initialization: { lobby }, round},
		datesHistory,
		guildInfo,
		config: guildConfig,
	} = guildBotDoc;
	const {config, dates} = round

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const lobbyChannel = await client.channels.fetch(lobby.channelId)
	const lobbyMembers = lobbyChannel.members.filter(m => !m.user.bot && !_.includes(guildConfig.ignoreUsers, m.user.id))

	if (lobbyMembers.size < 2){
		console.log(`Match maker - No Enough Members in Lobby`,  { guildInfo, membersCount: lobbyMembers.size});
		return;
	}
	const { rooms } = matchRooms(Array.from(lobbyMembers.keys()), datesHistory, config.roomCapacity, forceMatch)
	console.log(`Match maker - Creating ${rooms.length} DATES`, {guildInfo});
	const maxRoomNum = _.max(_.map(dates, 'number')) || 0
	const newDates = await Promise.all(
		rooms.map(async (room, i) => {
			const roomNumber = maxRoomNum + i + 1;
			console.log(`Match maker - CREATING DATE.`, {guildInfo, room});
			const vc = await createVoiceChannel(guild, roomNumber, room);
			const roomParticipants = room.map((userId) => {
				const member = guild.members.cache.get(userId)
				member.voice.setChannel(vc.id)
				return {id: userId, name: member.user.username}
			})

			return {
				number: roomNumber,
				participants: roomParticipants,
				voiceChannelId: vc.id
			};
		})
	);

	console.log(`Match maker - Created DATES`, {newDates, guildInfo});

	await GuildSpeedDateBot.findOneAndUpdate({guildId: guildInfo.guildId}, {
		'activeSession.round.dates': [...dates, ...newDates],
	})
}

async function createSpeedDatesMatches(guildBotDoc, forceMatch = false) {
	try {
		await createSpeedDatesMatchesInternal(guildBotDoc, forceMatch);
	} catch (e) {
		console.log(`Failed to match make for guild ${guildBotDoc.guildInfo}`, e);
		throw Error(`Failed to match make for guild ${guildBotDoc.guildInfo}`);
	}
}

async function startDateMatchMakerTaskForGuild(guildId, interval){
	console.log("Match maker TASK - WAKING UP...", {guildId})
	const currentMoment = moment();
	let activeGuildBotDoc;
	try {
		activeGuildBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log("Match Maker TASK - STOP - active session not found", {guildId})
		return;
	}
	const {activeSession:{ round:{ config,  matchMaker} } } = activeGuildBotDoc;
	const stopMatchingMoment = moment(config.startTime).add(matchMaker.durationInSeconds, "seconds");
	if(currentMoment > stopMatchingMoment){
		await createSpeedDatesMatches(activeGuildBotDoc, true);
		console.log("Match Maker TASK - COMPLETED", {guildInfo: activeGuildBotDoc.guildInfo, roundStartTime: config.startTime, currentMoment, stopMatchingMoment})
		return;
	}
	await createSpeedDatesMatches(activeGuildBotDoc, false)
	console.log(`Match maker TASK - SLEEPING... `, { intervalMs: interval, guildInfo: activeGuildBotDoc.guildInfo})
	console.log(`Speed Date Round Terminator Task - SLEEPING...`, {guildInfo: activeGuildBotDoc.guildInfo, intervalMs: interval, roundStartTime: config.startTime,
		currentMoment, stopMatchingMoment, secondsLeft: stopMatchingMoment.diff(currentMoment, 'seconds')  })


	setTimeout(() => startDateMatchMakerTaskForGuild(guildId, interval), interval);
}

async function startDateMatchMakerTaskWithDelay(guildId, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds){
	console.log("Match maker TASK WITH DELAY - START", {guildId, matchMakerInterval, matchMakerTaskDelay})
	// 1. Assert active session
	try {
		await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log("Match maker TASK with DELAY - FAILED - active session not found", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`Match maker TASK with DELAY - FAILED - active session not found for ${guildId}, ${e}`)
	}
	// 1. Update match maker configurations
	try {
		await updatedMatchMakerFieldsForGuild(guildId, matchMakerDurationInSeconds);
	} catch (e) {
		console.log("Match maker TASK with DELAY - FAILED - failed to update match maker config", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`Match maker TASK with DELAY - FAILED - failed to update match maker config ${guildId}, ${e}`)
	}
	// Starting match maker task in delay to let people enter the lobby and enjoy the music
	setTimeout(() => startDateMatchMakerTaskForGuild(guildId, matchMakerInterval), matchMakerTaskDelay);
}

module.exports = {
	startDateMatchMakerTaskWithDelay
}
