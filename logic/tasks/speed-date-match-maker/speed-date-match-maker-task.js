const client = require('../../discord/client')
const GuildSpeedDateBot = require('../../db/models/GuildSpeedDateBot')
const matchRooms = require('./speed-date-match-maker-manager')
const {createVoiceChannel} = require('../../vcShuffle')
const _ = require('lodash')
const { getGuildSpeedDateBotDocumentOrThrow } = require("../../db/guild-db-manager");
const moment = require("moment");


async function createSpeedDatesMatches(guildBotDoc) {
	const {activeSpeedDateSession: {routerVoiceChannel, speedDateSessionConfig, participants, rooms},
		memberMeetingsHistory, guildInfo} = guildBotDoc;

	const guild = await client.guilds.fetch(guildInfo.guildId)
	const routerChannel = await client.channels.fetch(routerVoiceChannel.channelId)

	if (routerChannel.members.size === 0){
		console.log(`No members in speed date Router for guild ${guildInfo}`);
		return;
	}

	const { rooms: groups } = matchRooms(Array.from(routerChannel.members.keys()), memberMeetingsHistory, speedDateSessionConfig.roomCapacity)

	const maxRoomNum = _.max(_.map(rooms, 'number')) || 0
	const newRooms = await Promise.all(
		groups.map(async (group, i) => {
			const roomNumber = maxRoomNum + i + 1;
			const vc = await createVoiceChannel(guild, roomNumber, group);
			const roomParticipants = group.map((userId) => {
				const user = guild.members.cache.get(userId)
				user.voice.setChannel(vc.id)
				participants[userId] = group.filter(uid => uid !== userId)
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
		'activeSpeedDateSession.speedDates': [...rooms, ...newRooms],
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