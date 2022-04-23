const client = require("./discord/client");
const Session = require("./db/models/Session");
const { Permissions } = require('discord.js');
const _ = require("lodash");

const startSession = async (sessionData) => {
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

	try {
		const { guildId, channel, roomCapacity, status, rounds, roundCount, roundDuration, breakDuration } = session;

		if (status === "ended") return;

		if (_.size(rounds) === roundCount) {
			console.log("Session Ended");
			session.status = "ended";
			return session.save();
		}

		const guild = client.guilds.cache.get(guildId);

		// fetch participants from <guildId>/<channel> - no bots, no offline users
		const participants = Array.from(
			guild.channels.cache.get(channel).members.filter(m => {
				// console.log({ m })
				return !m.user.bot && m.presence.status !== "offline";
			}).keys()
		);

		const groups = _.chunk(_.shuffle(participants), roomCapacity);

		const lastRoundMaxNumber = _.get(
			_.maxBy(_.last(session.rounds)?.rooms, r => r.number),
			"number",
			-1
		);

		const rooms = await Promise.all(
			_.map(groups, async (group, i) => {
				const roomNumber = lastRoundMaxNumber + i + 1;
				const vc = await createVoiceChannel(guild, roomNumber, group);
				return {
					number: roomNumber,
					participants: group,
					channelId: vc.id
				};
			})
		);

		session.rounds.push({ rooms });
		session.status = "ongoing";
		await session.save();

		console.log(`Round ${_.size(session.rounds)} Started`);

		setTimeout(() => {
			// endRound(sessionId)
			_.forEach(rooms, async ({ channelId }) => {
				const voiceChannel = await client.channels.fetch(channelId);
				await voiceChannel.delete();
			});
			console.log(`Round ${_.size(session.rounds)} Ended`);
			startRound(sessionId);
			// setTimeout(() => {
			// 	startRound(sessionId)
			// }, breakDuration * 60 * 1000)
		}, roundDuration * 60 * 1000);
		// }, roundDuration * 60 * 1000);
	} catch (e) {
		console.error(e);
		session.status = "failed";
		session.save();
	}
};

async function createVoiceChannel(guild, roomNumber, memberIds) {
	const permissionOverwrites = [
		{
			id: guild.id, deny: [Permissions.FLAGS.CONNECT] },
		..._.map(memberIds, id => ({ id: id, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK] })
		)
	];
	return guild.channels.create(`Room#${roomNumber}`, {
		type: "GUILD_VOICE",
		reason: "Let's connect and get to know each other :)",
		permissionOverwrites: permissionOverwrites
	})
}

const addToRoom = async (session, userId, roomNumber) => {
	try {
		console.log("addToRoom", { userId, roomNumber });

		const room = _.find(_.last(session.rounds)?.rooms, r => r.number === roomNumber);
		room.participants.push(userId);

		await session.save();
	} catch (e) {
		throw "Wrong parameters";
	}

};

const getOnGoing = (guildId, channel) => Session.findOne({ guildId, channel, status: "ongoing" });

const getUserRoom = async (guildId, channelId, userId) => {
	const session = await getOnGoing(guildId, channelId)

	if (session.status !== 'ongoing') return null

	const rooms = _.last(session.rounds)?.rooms || []
	return _.find(rooms, r => _.includes(r.participants, userId))
}

module.exports = {
	startSession,
	startRound,
	addToRoom,

	getOnGoing,
	getUserRoom,

	createVoiceChannel
};