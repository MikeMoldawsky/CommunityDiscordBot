const mongoose = require('mongoose')
const db = require('../db')

const RoomSchema = new mongoose.Schema({
	number: Number,
	participants: [String],
	channelId: String,
})

const RoundSchema = new mongoose.Schema({
	creator: String,
	guildId: String,
	channelId: String,
	lobbyId: String,
	roleId: String,
	startTime: Date,
	duration: {type: Number, default: 10},
	roomCapacity: {type: Number, default: 2},
	status: {type: String, default: 'active'},
	rooms: [RoomSchema],
});

const Round = db.model('Round', RoundSchema)

module.exports = Round