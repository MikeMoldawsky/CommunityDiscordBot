/**
 * @file Sample help command with slash command.
 * @author Naman Vrati
 * @author Thomas Fournier <thomas@artivain.com>
 * @since 3.0.0
 * @version 3.1.0
 */

// Deconstructed the constants we need in this file.

const { SlashCommandBuilder } = require("@discordjs/builders");
const { createVoiceChannel } = require("../../../logic/vcShuffle");
const client = require("../../../logic/client");

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("test-cmd")
		.setDescription(
			"Test"
		),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */


	async execute(interaction) {

		console.log({interaction})
		const {guildId, channelId, user} = interaction

		try {
			const guild = client.guilds.cache.get(guildId);

			const participants = Array.from(
				guild.channels.cache.get(channelId).members.filter(m => {
					return !m.user.bot
				}).keys()
			)

			const vc1 = await createVoiceChannel(guild, 1, [participants[0]])
			const vc2 = await createVoiceChannel(guild, 2, [participants[1]])

			console.log({vc1, vc2})

			setTimeout(() => {
				vc1.delete()
				vc2.delete()
			}, 120 * 1000)

			await interaction.reply({
				content: 'Channels Created!'
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
