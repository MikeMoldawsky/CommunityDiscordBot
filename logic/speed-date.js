const client = require('./client')
const GuildSpeedDateBot = require('./db/models/GuildSpeedDateBot')
const matchRooms = require('./match-rooms')
const {createVoiceChannel} = require('./vcShuffle')
const _ = require('lodash')

const ASSIGN_INTERVAL = 7 * 1000
const ASSIGN_ROUNDS = 3

const assignRound = async (guildId) => {
	let guildInfo = await GuildSpeedDateBot.findOne({ guildId }).exec();
	if (!guildInfo || !guildInfo.activeSpeedDateSession) {
		console.log(`assignRounds - no guild or active session for guild ${guildId}`)
		return
	}

	const {assignRounds, routerVoiceChannel, speedDateSessionConfig, participants, rooms} = guildInfo.activeSpeedDateSession

	if (assignRounds >= ASSIGN_ROUNDS) {
		console.log(`assignRounds - rounds limit reached for guild ${guildId}`)
		return
	}

	const guild = client.guilds.cache.get(guildId)
	const routerChannel = await client.channels.fetch(routerVoiceChannel.channelId)

	if (routerChannel.members.size === 0) return

	const { rooms: groups } = matchRooms(Array.from(routerChannel.members.keys()), {}, speedDateSessionConfig.roomCapacity)

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

	const newAssignRounds = assignRounds + 1

	await GuildSpeedDateBot.findOneAndUpdate({guildId}, {
		'activeSpeedDateSession.participants': participants,
		'activeSpeedDateSession.assignRounds': newAssignRounds,
		'activeSpeedDateSession.rooms': [...rooms, ...newRooms],
	})
}

module.exports = {
	ASSIGN_ROUNDS,
	ASSIGN_INTERVAL,
	assignRound
}