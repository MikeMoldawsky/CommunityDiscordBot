module.exports = {
	// DEFAULT PARAMS
	DEFAULT_SPEED_DATE_DURATION_MINUTES: 3,
	DEFAULT_ROOM_CAPACITY: 2,
	// Match Maker
	MATCH_MAKER_INTERVAL: 10 * 1000, // check for matches every 10 seconds
	MATCH_MAKER_TASK_DELAY: 5 * 1000, // start matching after 5 seconds
	MATCH_MAKER_DURATION_SECONDS: 60, // match in the first 60 seconds
	// ROUND TERMINATOR
	ROUND_TERMINATOR_TASK_INTERVAL: 10 * 1000,
}