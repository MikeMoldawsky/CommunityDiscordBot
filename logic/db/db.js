const mongoose = require('mongoose')

const conn = mongoose.createConnection(process.env.MONGO_URI);

//Bind connection to error event (to get notification of connection errors)
conn.on('error', console.error.bind(console, 'MongoDB connection error:'));

module.exports = conn