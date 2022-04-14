const mongoose = require('mongoose')
const db = require('../db')
const RoundSchema = require('./Round')

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
	round: RoundSchema,
	participants: Object, // { [participantId]: {} }
}, { _id : false })

const ConfigSchema = new mongoose.Schema({
	imageUrl: String,
}, { _id : false })

const GuildInfoSchema = new mongoose.Schema({
	guildId: String,
	config: ConfigSchema,
	activeSpeedDateSession: ActiveSpeedDateSessionSchema,
	speedDatesHistory: [RoundSchema],
	participantsHistory: Object,
})

const GuildInfo = db.model('GuildInfo', GuildInfoSchema)

module.exports = GuildInfo