const mongoose = require('mongoose')
const db = require('../db')

const Schema = mongoose.Schema;

const RoomSchema = new Schema({
	number: Number,
	participants: [String],
	channelId: String,
})

const RoundSchema = new Schema({
	creator: String,
	guildId: String,
	channelId: String,
	lobbyId: String,
	roleId: String,
	startTime: Date,
	duration: {type: Number, default: 10},
	roomCapacity: {type: Number, default: 2},
	rooms: [RoomSchema],
});

const Round = db.model('Round', RoundSchema)

module.exports = Round