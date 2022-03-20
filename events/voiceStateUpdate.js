/**
 * @file Main trigger handler file.
 * @author Naman Vrati
 * @since 2.0.0
 */
const _ = require("lodash");
const client = require("../logic/client");
const Round = require("../logic/db/models/Round");

module.exports = {
	name: "voiceStateUpdate",

	/**
	 * @description Executes when a channel is created and handle it.
	 * @author Naman Vrati
	 * @param {*} message The message which was created.
	 */

	async execute(oldState, newState) {
		/**
		 * @type {String[]}
		 * @description The Message Content of the received message seperated by spaces (' ') in an array, this excludes prefix and command/alias itself.
		 */

		const round = await Round.findOne({lobbyId: newState.channelId})
		if (round) {
			console.log('ROUND FOUND', round)
			const userId = newState.id
			const room = _.find(round.rooms, r => _.includes(r.participants, userId))
			if (room) {
				console.log('ROOM FOUND', room)
				const guild = client.guilds.cache.get(newState.guild.id)
				await guild.members.cache.get(newState.id).voice.setChannel(room.channelId)
			}
		}
	},
};
