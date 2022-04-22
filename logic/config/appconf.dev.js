module.exports = {
	// DEFAULT PARAMS
	DEFAULT_SPEED_DATE_DURATION_MINUTES: .5,
	DEFAULT_ROOM_CAPACITY: 2,
	// Match Maker
	MATCH_MAKER_INTERVAL: 3 * 1000, // check for matches every 10 seconds
	MATCH_MAKER_TASK_DELAY: 2 * 1000, // start matching after 5 seconds
	MATCH_MAKER_DURATION_SECONDS: 20, // match in the first 60 seconds
	// ROUND TERMINATOR
	ROUND_TERMINATOR_TASK_INTERVAL: 2 * 1000,
}