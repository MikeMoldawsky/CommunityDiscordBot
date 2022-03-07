const mongoose = require('mongoose')
const db = require('../db')

const Schema = mongoose.Schema;

const RoomSchema = new Schema({
	number: Number,
	participants: [String],
	channelId: String,
})

const RoundSchema = new Schema({
	rooms: [RoomSchema],
})

const SessionSchema = new Schema({
	creator: String,
	guildId: String,
	channel: String,
	startsAt: Date,
	status: {type: String, default: 'scheduled'},
	roundCount: {type: Number, default: 3},
	roundDuration: {type: Number, default: 10},
	breakDuration: {type: Number, default: 5},
	roomCapacity: {type: Number, default: 2},
	rounds: [RoundSchema],
});

const Session = db.model('Session', SessionSchema)

module.exports = Session