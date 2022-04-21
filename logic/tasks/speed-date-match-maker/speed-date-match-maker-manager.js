const _ = require('lodash')

const matchRoom = (unmatched, rooms, roomCapacity, datesHistory = {}, forceMatch = false) => {
	if (unmatched.length === 0) {
		return { rooms, datesHistory }
	}

	const memberOptions = _.sortBy(
		_.map(_.shuffle(unmatched), m => {
			return {
				id: m,
				options: unmatched.length - (_.has(datesHistory, m) ? datesHistory[m].length : 1),
			}
		}),
		'options'
	)

	let options = _.map(memberOptions, 'id')
	// console.log({ memberOptions, options })

	const roomMembers = [_.first(options)]
	options = _.tail(options)

	for (let i = 0; i < roomCapacity - 1; i++) {
		const available = _.difference(options, _.flatMap(roomMembers, m => _.get(datesHistory, m, [])))
		if (available.length > 0) {
			roomMembers.push(_.last(available))
			options = _.initial(options)
		}
		else if (forceMatch && options.length > 0) {
			console.log(`Forcing match for members who have no unique options`)
			roomMembers.push(_.last(options))
			options = _.initial(options)
		}
	}

	_.forEach(roomMembers, m => {
		_.set(datesHistory, m, [..._.get(datesHistory, m, []), ..._.without(roomMembers, m)])
	});
	rooms.push(roomMembers);
	return matchRoom(_.without(unmatched, ...roomMembers), rooms, roomCapacity, datesHistory, forceMatch);
}

const speedDateMatchMakerManager = (members, datesHistory = {}, roomCapacity, forceMatch) => {
	// console.log('matchRoom', {members, roomCapacity: roomCapacity})
	return matchRoom(members, [], roomCapacity, datesHistory, forceMatch);
}

module.exports = speedDateMatchMakerManager