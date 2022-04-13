const mongoose = require('mongoose')
const db = require('../db')
const RoundSchema = require('./Round')

const ActiveRoundSchema = new mongoose.Schema({
	round: RoundSchema,
	lobbyId: String,
	routerRoleId: String,
	participants: Object, // { [participantId]: {} }
})

const ConfigSchema = new mongoose.Schema({
	imageUrl: String,
})

const GuildInfoSchema = new mongoose.Schema({
	guildId: String,
	config: ConfigSchema,
	activeSpeedDate: ActiveRoundSchema,
	speedDatesHistory: [RoundSchema],
	participantsHistory: Object,
})

const GuildInfo = db.model('GuildInfo', GuildInfoSchema)

module.exports = GuildInfo