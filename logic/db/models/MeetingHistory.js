const mongoose = require('mongoose')
const db = require('../db')

const MeetingHistorySchema = new mongoose.Schema({
	guildId: String,
	history: {type: Object, default: {}}
})

const MeetingHistory = db.model('MeetingHistory', MeetingHistorySchema)

module.exports = MeetingHistory