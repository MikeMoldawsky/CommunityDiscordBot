const _ = require('lodash')

const matchRoom = (unmatchedMembers, rooms, datesHistory = {}, roomCapacity) => {
	// if all members have been assigned or only 1 remaining stop recursion
	if (unmatchedMembers.length <= 1) {
		return { rooms, datesHistory }
	}

	const membersAvailability = prepareMemberAvailabilityList(unmatchedMembers, datesHistory)

	const roomMembers = matchRoomMembers(membersAvailability, roomCapacity)

	if (roomMembers.length > 1) {
		rooms.push(roomMembers);
	}
	const newUnmatchedMembers = _.without(unmatchedMembers, ...roomMembers)

	return matchRoom(newUnmatchedMembers, rooms, datesHistory, roomCapacity);
}

const prepareMemberAvailabilityList = (unmatchedMemberIds, datesHistory) => {
	// first shuffle for randomization
	const shuffledMemberIds = _.shuffle(unmatchedMemberIds)

	// filter meeting options for each members
	const membersAvailability = _.map(shuffledMemberIds, memberId => {
		const memberDatesHistory = _.get(datesHistory, memberId, [])
		const availableMembers = _.difference(unmatchedMemberIds, [memberId, ...memberDatesHistory])
		return {
			memberId,
			availableMembers,
		}
	})

	// return sorted by options count
	return _.sortBy(membersAvailability, ({availableMembers}) => availableMembers.length)
}

const matchRoomMembers = (membersAvailability, roomCapacity) => {
	let options = _.map(membersAvailability, 'memberId')

	// we start with the first item in the options as this is a member with the least possible options
	const roomMembers = [_.first(options)]
	options = _.tail(options)

	for (let i = 0; i < roomCapacity - 1; i++) {
		// check availability for already selected room members
		const roomMembersAvailability = _.map(roomMembers, memberId => _.find(membersAvailability, { memberId }).availableMembers)
		const availableMatches = _.intersection(...roomMembersAvailability)
		if (availableMatches.length > 0) {
			roomMembers.push(_.last(availableMatches))
			options = _.initial(options)
		}
		else {
			console.log(`Forcing match for members who have no unique options`)
			roomMembers.push(_.last(options))
			options = _.initial(options)
		}
	}

	return roomMembers
}

const speedDateMatchMakerManager = (members, datesHistory = {}, roomCapacity) => {
	// matchRoom will run recursively until there are no more members to match
	return matchRoom(members, [], datesHistory, roomCapacity);
}

module.exports = speedDateMatchMakerManager
