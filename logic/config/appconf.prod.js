module.exports = {
	// DEFAULT PARAMS
	DEFAULT_SPEED_DATE_DURATION_MINUTES: 3,
	DEFAULT_ROOM_CAPACITY: 2,
	// Match Maker
	MATCH_MAKER_INTERVAL: 3 * 1000, // check for matches every 3 seconds
	MATCH_MAKER_TASK_DELAY: 3 * 1000, // start matching after 3 seconds
	MATCH_MAKER_DURATION_PERCENTAGE: 0.4, // match in the first 40% of the round
	// ROUND TERMINATOR
	ROUND_TERMINATOR_TASK_INTERVAL: 10 * 1000,
}