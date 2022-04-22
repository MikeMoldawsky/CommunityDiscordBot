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


const RoundMatchMakerSchema = new mongoose.Schema({
	durationInSeconds: Number
}, { _id : false });

const RoundConfigSchema = new mongoose.Schema({
	startTime: Date,
	durationInMinutes: Number,
	roomCapacity: Number
}, { _id : false });

const RoundSchema = new mongoose.Schema({
	config: RoundConfigSchema,
	matchMaker: RoundMatchMakerSchema,
	dates: {type: [DateSchema], default: []},
}, { _id : false });

const LobbySchema = new mongoose.Schema({
	allowedRoleId: String,
	allowedRoleName: String,
	channelId: String,
	channelName: String
}, { _id : false })

const InitializationConfigSchema = new mongoose.Schema({
	lobby: {type: LobbySchema, default: {}},
}, { _id : false })

const ActiveSessionSchema = new mongoose.Schema({
	initialization: {type: InitializationConfigSchema, default: {}},
	round: {type: RoundSchema, default: {}},
}, { _id : false })

const SpeedDateInviteConfig = new mongoose.Schema({
	title: String,
	description: String,
	image : String,
}, { _id : false })

const SpeedDateMusicConfig = new mongoose.Schema({
	url: String,
	volume: Number,
}, { _id : false })

const SpeedDateVoiceLobbyConfig = new mongoose.Schema({
	invite: SpeedDateInviteConfig,
	music: SpeedDateMusicConfig
}, { _id : false })


const ConfigSchema = new mongoose.Schema({
	voiceLobby: SpeedDateVoiceLobbyConfig
}, { _id : false })

const GuildInfoSchema = new mongoose.Schema({
	guildId: String,
	guildName: String,
}, { _id : false })

const GuildSpeedDateBotSchema = new mongoose.Schema({
	guildInfo: {type: GuildInfoSchema, default: {}},
	config: {type: ConfigSchema, default: {}},
	activeSession: {type: ActiveSessionSchema, default: {}},
	datesHistory: {type: Object, default: {}},
})

const GuildSpeedDateBot = db.model('GuildSpeedDateBot', GuildSpeedDateBotSchema)

module.exports = GuildSpeedDateBot