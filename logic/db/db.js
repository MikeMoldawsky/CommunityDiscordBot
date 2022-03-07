const mongoose = require('mongoose')
const {mongo_connection_string} = require('../../config.json')

const conn = mongoose.createConnection(mongo_connection_string);

//Bind connection to error event (to get notification of connection errors)
conn.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = conn