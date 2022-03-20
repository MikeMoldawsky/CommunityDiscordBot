/**
 * @file Main trigger handler file.
 * @author Naman Vrati
 * @since 2.0.0
 */
const _ = require("lodash");
const client = require("../logic/client");
const Round = require("../logic/db/models/Round");
const MeetingHistory = require("../logic/db/models/MeetingHistory");

module.exports = {
	name: "voiceStateUpdate",

	/**
	 * @description Executes when a channel is created and handle it.
	 * @author Naman Vrati
	 * @param {*} oldState
	 * @param {*} newState
	 */

	async execute(oldState, newState) {
		/**
		 * @type {String[]}
		 * @description The Message Content of the received message seperated by spaces (' ') in an array, this excludes prefix and command/alias itself.
		 */

		const round = await Round.findOne({lobbyId: newState.channelId, status: 'active'})
		if (round) {
			console.log('ROUND FOUND', round)
			const userId = newState.id
			const guildId = newState.guild.id
			const room = _.find(round.rooms, r => _.includes(r.participants, userId))
			if (room) {
				console.log('ROOM FOUND', room)
				const guild = client.guilds.cache.get(guildId)
				await guild.members.cache.get(newState.id).voice.setChannel(room.channelId)

				let meetingsHistory = await MeetingHistory.findOne({ guildId })
				if (!meetingsHistory) {
					meetingsHistory = new MeetingHistory({ guildId })
				}
				const channel = await guild.channels.cache.get(room.channelId)
				const newHistory = _.reduce(Array.from(channel.members.values()), (h, m) => {
					console.log({m})
						return {
							...h,
							[m.id]: [...(_.get(h, m.id, [])), userId],
						}
				}, meetingsHistory.history)

				console.log({newHistory})
				newHistory[userId] = Array.from(channel.members.keys())

				meetingsHistory.history = newHistory
				await meetingsHistory.save()
			}
		}
	},
};
