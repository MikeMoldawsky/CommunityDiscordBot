const mongoose = require('mongoose')
const db = require('../db')

const ParticipantSchema = new mongoose.Schema({
	id: String,
	name: String,
})

const RoomSchema = new mongoose.Schema({
	number: Number,
	participants: [ParticipantSchema],
	voiceChannelId: String,
})

const RoundSchema = new mongoose.Schema({
	creator: String,
	channelId: String,
	startTime: Date,
	duration: {type: Number, default: 10},
	roomCapacity: {type: Number, default: 2},
});

// const Round = db.model('Round', RoundSchema)

module.exports = RoundSchema