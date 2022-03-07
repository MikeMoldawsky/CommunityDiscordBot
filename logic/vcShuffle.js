const Session = require("./db/models/Session");
const _ = require("lodash");

const startSession = async sessionData => {
	// validate session not ongoing
	// let session = await Session.findOne({
	// 	guildId: sessionData.guildId,
	// 	channel: sessionData.channel,
	// 	status: {$in: ['scheduled', 'ongoing']}
	// })
	// if (!_.isNil(session)) throw `Session already ${session.status}`

	// save to db
	const session = new Session(sessionData);

	const result = await session.save();

	await startRound(result.id);
};

const startRound = async sessionId => {
	const session = await Session.findById(sessionId);

	const { guildId, channel, roomCapacity, status, rounds, roundCount, roundDuration, breakDuration } = session;
	if (status === "ended") return;

	if (_.size(rounds) === roundCount) {
		console.log("Session Ended");
		session.status = "ended";
		return session.save();
	}

	// todo - fetch users from <guildId>/<channel>
	const participants = ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8"];
	const rooms = _.chunk(_.shuffle(participants), roomCapacity);

	const lastRoundMaxNumber = _.get(
		_.maxBy(_.last(session.rounds)?.rooms, r => r.number),
		"number",
		-1
	);

	session.rounds.push({
		rooms: _.map(rooms, (r, i) => ({
			number: lastRoundMaxNumber + i + 1,
			participants: r
		}))
	});
	session.status = "ongoing";
	await session.save();

	console.log(`Round ${_.size(session.rounds)} Started`);

	setTimeout(() => {
		// endRound(sessionId)
		console.log(`Round ${_.size(session.rounds)} Ended`);
		startRound(sessionId);
		// setTimeout(() => {
		// 	startRound(sessionId)
		// }, breakDuration * 60 * 1000)
	}, roundDuration * 60 * 1000);

};

const addToRoom = async (session, userId, roomNumber) => {
	try {
		console.log("addToRoom", { userId, roomNumber });

		const room = _.find(_.last(session.rounds)?.rooms, r => r.number === roomNumber)
		room.participants.push(userId)

		// session.rounds[session.rounds.length - 1].rooms[roomNumber].participants.push(userId);
		await session.save();
	} catch (e) {
		throw "Wrong parameters";
	}

};

const getOnGoing = (guildId) => Session.findOne({ guildId, status: "ongoing" });
const getOnGoingByCreator = (guildId, creator) => Session.findOne({ guildId, creator, status: "ongoing" });

module.exports = {
	startSession,
	startRound,
	addToRoom,
	getOnGoing,
	getOnGoingByCreator
};