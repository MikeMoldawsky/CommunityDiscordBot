const client = require('../discord/client')
const matchRooms = require('../speed-date-match-maker/speed-date-match-maker-manager')
const _ = require('lodash')
const { getGuildWithActiveSessionOrThrow, updatedMatchMakerFieldsForGuild, findGuildAndUpdate } = require("../db/guild-db-manager");
const moment = require("moment");
const { createSpeedDateVoiceChannelRoom } = require("../discord/discord-speed-date-manager");

async function createSpeedDatesMatchesInternal(guildBotDoc, forceMatch = false) {
	console.log(`Match maker - SEARCHING DATES - ${guildBotDoc.guildInfo}, forceMatch ${forceMatch}`)
	const {
		activeSession: {initialization: { lobby }, round},
		datesHistory,
		guildInfo,
	} = guildBotDoc;
	const {config, dates} = round

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const lobbyChannel = await client.channels.fetch(lobby.channelId)

	// get available members from lobby and members that are alone in a room if any
	const aloneMemberDates = getMembersAloneInRoom(dates)
	const membersAloneInRoom = _.keys(aloneMemberDates)
	const availableMemberIds = [
		...getLobbyAvailableMembers(lobbyChannel, lobby),
		...membersAloneInRoom
	]

	if (availableMemberIds.length < 2){
		console.log(`Match maker - Not Enough Members in Lobby`,  { guildInfo, membersCount: availableMemberIds.length});
		return;
	}

	const { rooms } = matchRooms(availableMemberIds, datesHistory, config.roomCapacity, forceMatch)
	console.log(`Match maker - Creating ${rooms.length} DATES`, {guildInfo});
	let newDates = dates
	const maxRoomNum = _.max(_.map(dates, 'number')) || 0
	await Promise.all(
		rooms.map(async (room, i) => {
			let roomNumber = maxRoomNum + i + 1;
			let voiceChannel
			const membersAlreadyInRooms = _.intersection(room, membersAloneInRoom)
			if (_.isEmpty(membersAlreadyInRooms)) {
				console.log(`Match maker - CREATING DATE.`, {guildInfo, room});
				voiceChannel = await createSpeedDateVoiceChannelRoom(guild, roomNumber, room);
				newDates.push({
					number: roomNumber,
					participants: addMembersToRoom(guild, room, voiceChannel),
					voiceChannelId: voiceChannel.id
				})
			}
			else {
				console.log(`Match maker - ADDING MEMBER TO EXISTING DATE.`, {guildInfo, room});
				const joinedRoom = _.find(newDates, ({ number }) => number === aloneMemberDates[membersAlreadyInRooms[0]].number)
				voiceChannel = await client.channels.fetch(joinedRoom.voiceChannelId)
				joinedRoom.participants = addMembersToRoom(guild, room, voiceChannel)

				if (membersAlreadyInRooms.length === 2) {
					// both members are alone in their rooms
					const roomToDelete = _.find(newDates, ({ number }) => number === aloneMemberDates[membersAlreadyInRooms[1]].number)
					roomToDelete.participants = []
				}
			}
		})
	);

	console.log(`Match maker - Created DATES`, {newDates, guildInfo});
	await findGuildAndUpdate(guildInfo.guildId, {
		'activeSession.round.dates': newDates,
	});
}

const getLobbyAvailableMembers = (lobbyChannel, lobbyConfig) => {
	return Array.from(
		lobbyChannel.members.filter(m => {
			return m.user.id !== process.env.DISCORD_CLIENT_ID && !m.roles.cache.some(role => role.id === lobbyConfig.keepInLobbyRoleId)
		}).keys()
	)
}

const getMembersAloneInRoom = dates => {
	return dates.reduce((aloneMemberDates, date) => {
		const voiceChannel = client.channels.cache.get(date.voiceChannelId)
		return _.size(voiceChannel.members) === 1
			? {
				...aloneMemberDates,
				[voiceChannel.members.first().user.id]: date,
			}
			: aloneMemberDates
	}, {})
}

const addMembersToRoom = (guild, members, vc) => {
	return members.map((userId) => {
		const member = guild.members.cache.get(userId)
		member.voice.setChannel(vc.id)
		return {id: userId, name: member.user.username}
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
		const stopMatchingMoment = moment(config.startTime).add(matchMaker.durationInSeconds, "seconds");
		if(currentMoment > stopMatchingMoment){
			await createSpeedDatesMatches(activeGuildBotDoc, true);
			console.log("Match Maker TASK - COMPLETED", {guildInfo: activeGuildBotDoc.guildInfo, roundStartTime: config.startTime, currentMoment, stopMatchingMoment})
			return;
		}
		await createSpeedDatesMatches(activeGuildBotDoc, false)
		console.log(`Match maker TASK - SLEEPING... `, { intervalMs: interval, guildInfo: activeGuildBotDoc.guildInfo})
		console.log(`Match maker Task - SLEEPING...`, {guildInfo: activeGuildBotDoc.guildInfo, intervalMs: interval, roundStartTime: config.startTime,
			currentMoment, stopMatchingMoment, secondsLeft: stopMatchingMoment.diff(currentMoment, 'seconds')  })
		setTimeout(() => startDateMatchMakerTaskForGuild(guildId, interval), interval);
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
	setTimeout(() => startDateMatchMakerTaskForGuild(guildId, matchMakerInterval), matchMakerTaskDelay);
}

module.exports = {
	startDateMatchMakerTaskWithDelay
}
