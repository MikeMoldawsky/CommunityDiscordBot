const client = require('../../discord/client')
const GuildSpeedDateBot = require('../../db/models/GuildSpeedDateBot')
const matchRooms = require('./speed-date-match-maker-manager')
const {createVoiceChannel} = require('../../vcShuffle')
const _ = require('lodash')
const { getGuildWithActiveSessionOrThrow, updatedMatchMakerFieldsForGuild } = require("../../db/guild-db-manager");
const moment = require("moment");


async function createSpeedDatesMatchesInternal(guildBotDoc, forceMatch = false) {
	const {activeSession: {routerVoiceChannel, sessionConfig, participants, dates},
		memberMeetingsHistory, guildInfo} = guildBotDoc;

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const routerChannel = await client.channels.fetch(routerVoiceChannel.channelId)
	const routerMembers = routerChannel.members.filter(m => !m.user.bot)

	if (routerMembers.size < 2){
		console.log(`Match maker - no enough members for match in Router Lobby`,  { guildInfo, membersCount: routerChannel.members.size});
		return;
	}
	const { rooms } = matchRooms(Array.from(routerMembers.keys()), memberMeetingsHistory, sessionConfig.roomCapacity, forceMatch)
	console.log(`Match maker Creating ${rooms.length} DATES- ${guildInfo}`);
	const maxRoomNum = _.max(_.map(dates, 'number')) || 0
	const newDates = await Promise.all(
		rooms.map(async (room, i) => {
			const roomNumber = maxRoomNum + i + 1;
			console.log(`Match maker CREATING DATE - ${guildInfo}, ${room}`);
			const vc = await createVoiceChannel(guild, roomNumber, room);
			const roomParticipants = room.map((userId) => {
				const member = guild.members.cache.get(userId)
				member.voice.setChannel(vc.id)
				participants[userId] = room.filter(uid => uid !== userId)
				return {id: userId, name: member.user.username}
			})

			return {
				number: roomNumber,
				participants: roomParticipants,
				voiceChannelId: vc.id
			};
		})
	);

	await GuildSpeedDateBot.findOneAndUpdate({guildId: guildInfo.guildId}, {
		'activeSession.participants': participants,
		'activeSession.dates': [...dates, ...newDates],
	})
}


async function createSpeedDatesMatches(guildBotDoc, forceMatch = false) {
	try {
		console.log(`Match maker SEARCHING DATES - ${guildBotDoc.guildInfo}, forceMatch ${forceMatch}`)
		await createSpeedDatesMatchesInternal(guildBotDoc, forceMatch);
	} catch (e) {
		console.log(`Failed to match make for guild ${guildBotDoc.guildInfo}`, e);
		throw Error(`Failed to match make for guild ${guildBotDoc.guildInfo}`);
	}
}

async function startDateMatchMakerTaskForGuild(guildId, interval){
	console.log(`Match maker WAKING UP for guild ${guildId}`)
	const currentMoment = moment();
	let activeGuildBotDoc;
	try {
		activeGuildBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log(`Match maker STOP - active session not found - ${activeGuildBotDoc.guildInfo}`)
		return;
	}
	const {activeSession:{ matchMaker } } = activeGuildBotDoc;
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
	startDateMatchMakerTaskWithDelay
}