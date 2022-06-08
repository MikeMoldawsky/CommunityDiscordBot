const client = require('../discord/client')
const getRandomRoomMembers = require('../speed-date-match-maker/speed-date-match-maker-manager')
const { cleanupSpeedDateRound } = require('../speed-date-round-cleanup/speed-date-round-cleanup-manager')
const { getGuildWithActiveSessionOrThrow, updatedMatchMakerFieldsForGuild, findGuildAndUpdate } = require("../db/guild-db-manager");
const moment = require("moment");
const { createSpeedDateVoiceChannelRoom } = require("../discord/discord-speed-date-manager");
const { safeSetTimeout } = require("../utils/safe-timeout-utils");

async function createSpeedDatesMatchesInternal(guildBotDoc) {
	console.log(`Match maker - SEARCHING DATES - ${guildBotDoc.guildInfo}`)
	const {
		activeSession: {initialization: { lobby }, round},
		datesHistory,
		guildInfo,
		config: { admin, moderator }
	} = guildBotDoc;
	const {config, dates} = round

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const lobbyChannel = await client.channels.fetch(lobby.channelId)

	let remainingMemberIds = getLobbyAvailableMembers(lobbyChannel, lobby)
	if (remainingMemberIds.length < 2){
		console.log(`Match maker - Not Enough Members in Lobby`,  { guildInfo, membersCount: remainingMemberIds.length});
		return;
	}

	console.log(`Match maker - Creating DATES`, {guildInfo});
	const newDates = []
	while (remainingMemberIds.length > 1) {
		try	{
			const roomMembers = getRandomRoomMembers(remainingMemberIds, datesHistory, config.roomCapacity)
			console.log(`Match maker - CREATING DATE.`, {guildId: guild.id, roomMembers});
			let voiceChannel = await createSpeedDateVoiceChannelRoom(guild, roomMembers, admin.roleId, moderator.roleId);
			newDates.push({
				participants: await addMembersToRoom(guild, roomMembers, voiceChannel),
				voiceChannelId: voiceChannel.id
			})
		}
		catch (e) {
			console.log(`Failed to create a room, skipping and trying again. guild ${guildBotDoc.guildInfo}`, e);
		}
		remainingMemberIds = getLobbyAvailableMembers(lobbyChannel, lobby)
	}

	console.log(`Match maker - Created DATES`, {newDates, guildInfo});

	await findGuildAndUpdate(guildInfo.guildId, {
		'activeSession.round.dates': [...dates, ...newDates],
	});
}

const getLobbyAvailableMembers = (lobbyChannel, lobbyConfig) => {
	return Array.from(
		lobbyChannel.members.filter(m => {
			return m.user.id !== process.env.DISCORD_CLIENT_ID && !m.roles.cache.some(role => role.id === lobbyConfig.lobbyModeratorsRoleId)
		}).keys()
	)
}

const addMembersToRoom = async (guild, members, vc) => {
	return Promise.all(members.map(async (userId) => {
		const member = guild.members.cache.get(userId)
		await member.voice.setChannel(vc.id)
		return {id: userId, name: member.user.username}
	}))
}

async function createSpeedDatesMatches(guildBotDoc) {
	try {
		await createSpeedDatesMatchesInternal(guildBotDoc);
	} catch (e) {
		console.log(`Failed to match make for guild ${guildBotDoc.guildInfo}`, e);
		throw Error(`Failed to match make for guild ${guildBotDoc.guildInfo}`);
	}
}

async function startDateMatchMakerTaskForGuild(guildId, interval){
	try {
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
		// room cleanup
		const stopCleanupMoment = moment(config.startTime).add(config.durationInMinutes, "minutes").subtract(10, "seconds");
		if (currentMoment <= stopCleanupMoment) {
			await cleanupSpeedDateRound(guildId)
		}
		else {
			console.log("Match Maker TASK - MATCH MAKING COMPLETED", {guildInfo: activeGuildBotDoc.guildInfo, roundStartTime: config.startTime, currentMoment, stopCleanupMoment})
			return;
		}
		// match making
		const stopMatchingMoment = moment(config.startTime).add(matchMaker.durationInSeconds, "seconds");
		if(currentMoment <= stopMatchingMoment){
			await createSpeedDatesMatches(activeGuildBotDoc)
		}
		else {
			console.log("Match Maker TASK - MATCH MAKING ENDED, running room cleanup only", {guildInfo: activeGuildBotDoc.guildInfo, roundStartTime: config.startTime, currentMoment, stopMatchingMoment})
		}

		console.log(`Match maker TASK - SLEEPING... `, { intervalMs: interval, guildInfo: activeGuildBotDoc.guildInfo})
		const stopMatchingSecondsLeft = stopMatchingMoment.diff(currentMoment, 'seconds')
		console.log(`Match maker Task - SLEEPING...`, {
			guildInfo: activeGuildBotDoc.guildInfo,
			intervalMs: interval,
			roundStartTime: config.startTime,
			currentMoment,
			stopMatchingMoment,
			stopMatchingSecondsLeft: stopMatchingSecondsLeft > 0 ? stopMatchingSecondsLeft : 'Done',
			stopCleanupMoment,
			cleanupSecondsLeft: stopCleanupMoment.diff(currentMoment, 'seconds'),
		})
		safeSetTimeout(() => startDateMatchMakerTaskForGuild(guildId, interval), interval);
	} catch (e) {
		console.log(`Match Maker Task - Failed Fatal`, {guildId, e})
	}
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
	safeSetTimeout(() => startDateMatchMakerTaskForGuild(guildId, matchMakerInterval), matchMakerTaskDelay);
}

module.exports = {
	startDateMatchMakerTaskWithDelay
}
