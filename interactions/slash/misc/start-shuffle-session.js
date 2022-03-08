/**
 * @file Sample help command with slash command.
 * @author Naman Vrati
 * @author Thomas Fournier <thomas@artivain.com>
 * @since 3.0.0
 * @version 3.1.0
 */

// Deconstructed the constants we need in this file.

const { SlashCommandBuilder } = require("@discordjs/builders");
const { startSession } = require("../../../logic/vcShuffle");

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("start-shuffle-session")
		.setDescription(
			"Start a shuffled voice chat session"
		)
		.addChannelOption(option => option.setName('channel').setDescription("The participants channel"))
		.addIntegerOption((option) =>
			option
				.setName("rounds")
				.setDescription("Number of rounds"))
		.addIntegerOption((option) =>
			option
				.setName("duration")
				.setDescription("The meeting duration in minutes."))
		.addIntegerOption((option) =>
			option
				.setName("break-duration")
				.setDescription("The break duration between rounds."))
		.addIntegerOption((option) =>
			option
				.setName("room-capacity")
				.setDescription("The capacity of each room.")),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */


	async execute(interaction) {

		console.log({interaction})
		const {guildId, channelId, user} = interaction

		const customChannel = interaction.options.getChannel("channel")

		try {
			const session = await startSession({
				creator: user.id,
				guildId,
				channel: customChannel ? customChannel.id : channelId,
				startsAt: new Date(),
				roundCount: interaction.options.getInteger("rounds") || 1,
				roundDuration: interaction.options.getInteger("duration") || 1,
				breakDuration: interaction.options.getInteger("break-duration") || 1,
				roomCapacity: interaction.options.getInteger("room-capacity") || 1,
			})

			await interaction.reply({
				content: 'Session started!'
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
