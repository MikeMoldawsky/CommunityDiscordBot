const _ = require('lodash')

const matchRoom = (unmatched, rooms, roomCapacity, history = {}, forceMatch = false) => {
	// if (retries === 5) {
	// 	return { rooms, history }
	// }
	if (unmatched.length === 0) {
		return { rooms, history }
	}

	const memberOptions = _.sortBy(
		_.map(_.shuffle(unmatched), m => {
			return {
				id: m,
				options: unmatched.length - (_.has(history, m) ? history[m].length : 1),
			}
		}),
		'options'
	)

	let options = _.map(memberOptions, 'id')
	// console.log({ memberOptions, options })

	const roomMembers = [_.first(options)]
	options = _.tail(options)

	for (let i = 0; i < roomCapacity - 1; i++) {
		const available = _.difference(options, _.flatMap(roomMembers, m => _.get(history, m, [])))
		if (available.length > 0) {
			roomMembers.push(_.last(available))
			options = _.initial(options)
		}
		else if (forceMatch && options.length > 0) {
			roomMembers.push(_.last(options))
			options = _.initial(options)
		}
	}

	// console.log(`matchRooms`, {roomMembers, forceMatch})

	const isExtraRoom = roomMembers.length === 1 && roomCapacity > 1
	if (isExtraRoom) {
		// if (rooms.length === 0) {
		// 	// handle edge case
		// 	return matchRoom(unmatched, rooms, roomCapacity, history, retries + 1)
		// }
		// const extraMember = roomMembers[0]
		// let lastRoom = _.findLast(rooms, r => r.length <= roomCapacity && !_.includes(r, extraMember))
		// if (!lastRoom) {
		// 	lastRoom = _.findLast(rooms, r => r.length <= roomCapacity)
		// }
		// if (!lastRoom) {
		// 	lastRoom = _.last(rooms)
		// }
		//
		// history[extraMember] = [..._.get(history, extraMember, []), ...lastRoom]
		// _.forEach(lastRoom, m => {
		// 	_.set(history, m, [..._.get(history, m, []), extraMember])
		// })
		// lastRoom.push(extraMember)
	}
	else {
		_.forEach(roomMembers, m => {
			_.set(history, m, [..._.get(history, m, []), ..._.without(roomMembers, m)])
		})
		rooms.push(roomMembers)
	}

	// console.log({ history })

	return matchRoom(_.without(unmatched, ...roomMembers), rooms, roomCapacity, history, forceMatch)
}

const speedDateMatchMakerManager = (members, history = {}, roomCapacity, forceMatch) => {
	console.log('matchRoom', {members, roomCapacity: roomCapacity})
	return matchRoom(members, [], roomCapacity, history, forceMatch)
}

module.exports = speedDateMatchMakerManager