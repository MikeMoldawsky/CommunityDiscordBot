const mongoose = require('mongoose')
const db = require('../db')


const ParticipantSchema = new mongoose.Schema({
	id: String,
	name: String,
}, { _id : false })

const DateSchema = new mongoose.Schema({
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
	matchMakerStopTime: Date,
	speedDateStartTime: Date,
	dates: {type: [DateSchema], default: []},
	participants: {type: Object, default: {}}, // { [participantId]: {} }
}, { _id : false })

const SpeedDateInviteConfig = new mongoose.Schema({
	title: String,
	description: String,
	image : String,
}, { _id : false })

const ConfigSchema = new mongoose.Schema({
	invite: SpeedDateInviteConfig
}, { _id : false })

const GuildInfoSchema = new mongoose.Schema({
	guildId: String,
	guildName: String,
}, { _id : false })

const GuildSpeedDateBotSchema = new mongoose.Schema({
	guildInfo: GuildInfoSchema,
	config: ConfigSchema,
	activeSpeedDateSession: ActiveSpeedDateSessionSchema,
	memberMeetingsHistory: {type: Object, default: {}},
})

const GuildSpeedDateBot = db.model('GuildSpeedDateBot', GuildSpeedDateBotSchema)

module.exports = GuildSpeedDateBot