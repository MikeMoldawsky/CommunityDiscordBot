const mongoose = require('mongoose')
const db = require('../db')
const RoundSchema = require('./Round')

const ParticipantSchema = new mongoose.Schema({
	id: String,
	name: String,
}, { _id : false })

const RoomSchema = new mongoose.Schema({
	number: Number,
	participants: [ParticipantSchema],
	voiceChannelId: String,
}, { _id : false })

const SpeedDateSessionConfigSchema = new mongoose.Schema({
	lobbyChannelId: String,
	lobbyChannelName: String,
	speedDateDurationMinutes: Number,
	roomCapacity: Number
}, { _id : false })

const RouterVoiceChannelSchema = new mongoose.Schema({
	allowedRoleId: String,
	allowedRoleName: String,
	channelId: String,
	channelName: String
}, { _id : false })

const ActiveSpeedDateSessionSchema = new mongoose.Schema({
	speedDateSessionConfig: SpeedDateSessionConfigSchema,
	routerVoiceChannel: RouterVoiceChannelSchema,
	assignRounds: {type: Number, default: 0},
	rooms: {type: [RoomSchema], default: []},
	participants: {type: Object, default: {}}, // { [participantId]: {} }
}, { _id : false })

const ConfigSchema = new mongoose.Schema({
	imageUrl: String,
}, { _id : false })

const GuildInfoSchema = new mongoose.Schema({
	guildId: String,
	guildName: String,
}, { _id : false })

const GuildSpeedDateBotSchema = new mongoose.Schema({
	guildInfo: GuildInfoSchema,
	config: ConfigSchema,
	activeSpeedDateSession: ActiveSpeedDateSessionSchema,
	// speedDatesHistory: [RoundSchema],
	memberMeetingsHistory: {type: Object, default: {}},
})

const GuildSpeedDateBot = db.model('GuildSpeedDateBot', GuildSpeedDateBotSchema)

module.exports = GuildSpeedDateBot