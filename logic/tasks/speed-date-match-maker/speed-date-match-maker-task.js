const client = require('../../discord/client')
const GuildSpeedDateBot = require('../../db/models/GuildSpeedDateBot')
const matchRooms = require('./speed-date-match-maker-manager')
const {createVoiceChannel} = require('../../vcShuffle')
const _ = require('lodash')
const { getGuildSpeedDateBotDocumentOrThrow } = require("../../db/guild-db-manager");
const moment = require("moment");


async function createSpeedDatesMatches(guildBotDoc, forceMatch = false) {
	const {activeSpeedDateSession: {routerVoiceChannel, speedDateSessionConfig, participants, dates},
		memberMeetingsHistory, guildInfo} = guildBotDoc;

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const routerChannel = await client.channels.fetch(routerVoiceChannel.channelId)

	if (routerChannel.members.size === 0){
		console.log(`No members in speed date Router for guild ${guildInfo}`);
		return;
	}

	const { rooms } = matchRooms(Array.from(routerChannel.members.keys()), memberMeetingsHistory, speedDateSessionConfig.roomCapacity, forceMatch)

	const maxRoomNum = _.max(_.map(dates, 'number')) || 0
	const newDates = await Promise.all(
		rooms.map(async (room, i) => {
			const roomNumber = maxRoomNum + i + 1;
			console.log(`guild ${guild}\n numner: ${roomNumber}\n room: ${room}`)
			const vc = await createVoiceChannel(guild, roomNumber, room);
			const roomParticipants = room.map((userId) => {
				const user = guild.members.cache.get(userId)
				user.voice.setChannel(vc.id)
				participants[userId] = room.filter(uid => uid !== userId)
				return {id: userId, name: user.user.username}
			})

			return {
				number: roomNumber,
				participants: roomParticipants,
				voiceChannelId: vc.id
			};
		})
	);

	await GuildSpeedDateBot.findOneAndUpdate({guildId: guildInfo.guildId}, {
		'activeSpeedDateSession.participants': participants,
		'activeSpeedDateSession.dates': [...dates, ...newDates],
	})
}


async function startDateMatchMakerForGuild(guildId, interval){
	const currentMoment = moment();
	const guildBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
	if(!guildBotDoc.activeSpeedDateSession) {
		console.log(`Stop Match Making - Active session not found for ${guildBotDoc.guildInfo}`)
		return;
	}
	const stopMatchingMoment = moment(guildBotDoc.activeSpeedDateSession.matchMakerStopTime);
	if(currentMoment > stopMatchingMoment){
		try {
			await createSpeedDatesMatches(guildBotDoc, true);
		} catch (e) {
			console.log(`Failed to match make for guild ${guildBotDoc.guildInfo}`, e);
			throw Error(`Failed to match make for guild ${guildBotDoc.guildInfo}`);
		}
		console.log(`Stop Match Making - exceeded match making time for ${guildBotDoc.guildInfo}: ${currentMoment} > ${stopMatchingMoment}`)
		return;
	}
	console.log(`Searching matches for guild ${guildId}`);
	try {
		await createSpeedDatesMatches(guildBotDoc);
	} catch (e) {
		console.log(`Failed to match make for guild ${guildBotDoc.guildInfo}`, e);
		throw Error(`Failed to match make for guild ${guildBotDoc.guildInfo}`);
	}
	setTimeout(() => startDateMatchMakerForGuild(guildId, interval), interval);
}


module.exports = {
	startDateMatchMakerForGuild
}