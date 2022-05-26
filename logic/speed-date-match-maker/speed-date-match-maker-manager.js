const _ = require('lodash')

const getRandomRoomMembers = (unmatchedMembers, datesHistory = {}, roomCapacity) => {
	const membersAvailability = prepareMemberAvailabilityList(unmatchedMembers, datesHistory)

	return matchRoomMembers(membersAvailability, roomCapacity)
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
			const matchedMemberId = _.last(availableMatches)
			roomMembers.push(matchedMemberId)
			options = _.without(options, matchedMemberId)
		}
		else {
			console.log(`Forcing match for members who have no unique options`)
			roomMembers.push(_.last(options))
			options = _.initial(options)
		}
	}

	return roomMembers
}

module.exports = getRandomRoomMembers
