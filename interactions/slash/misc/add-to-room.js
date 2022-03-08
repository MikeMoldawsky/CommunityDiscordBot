/**
 * @file Sample help command with slash command.
 * @author Naman Vrati
 * @author Thomas Fournier <thomas@artivain.com>
 * @since 3.0.0
 * @version 3.1.0
 */

// Deconstructed the constants we need in this file.

const { SlashCommandBuilder } = require("@discordjs/builders");
const { getOnGoing, addToRoom } = require("../../../logic/vcShuffle");
const _ = require('lodash')

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("add-to-room")
		.setDescription(
			"Add user to a voice room"
		)
		.addStringOption((option) =>
			option
				.setName("user-id")
				.setDescription("The user to add"))
		.addIntegerOption((option) =>
			option
				.setName("room-number")
				.setDescription("Room number")),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {

		const {guildId, channelId, user} = interaction

		try {
			const session = await getOnGoing(guildId, channelId)
			if (_.isNil(session)) {
				return await interaction.reply({
					content: 'No ongoing session'
				})
			}
			if (session.creator !== user.id) {
				return await interaction.reply({
					content: 'Not Admin'
				})
			}

			if (session.rounds.length === 0) {
				return await interaction.reply({
					content: 'No ongoing round'
				})
			}

			await addToRoom(
				session,
				interaction.options.getString("user-id"),
				interaction.options.getInteger("room-number")
				)

			await interaction.reply({
				content: 'User Added!'
			})
		}
		catch (e) {
			console.error(e)
			await interaction.reply({
				content: e
			})
		}
	},
};
