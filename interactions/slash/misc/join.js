/**
 * @file Sample help command with slash command.
 * @author Naman Vrati
 * @author Thomas Fournier <thomas@artivain.com>
 * @since 3.0.0
 * @version 3.1.0
 */

// Deconstructed the constants we need in this file.

const { SlashCommandBuilder } = require("@discordjs/builders");
const { getUserRoom } = require("../../../logic/vcShuffle");
const client = require("../../../logic/client");
const { MessageEmbed } = require("discord.js");

async function createInviteEmbed(voiceChannel) {
	const invite = await voiceChannel.createInvite().catch(console.error);
	return new MessageEmbed()
		.setColor(0x4286f4)
		.setTitle("Your invite to the voice channel")
		.setDescription("It's all about connections")
		.setURL(invite.url)
		.setImage("https://i.imgur.com/ZGPxFN2.jpg");
}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("join")
		.setDescription(
			"Join your randomly assigned room"
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
			const room = await getUserRoom(guildId, channelId, user.id)

			const voiceChannel = await client.channels.fetch(room.channelId);

			const inviteEmbed = await createInviteEmbed(voiceChannel);
			await interaction.reply({
				embeds: [inviteEmbed],
				ephemeral: true,
			});

			// const connection = joinVoiceChannel(
			// 	{
			// 		channelId: room.channelId,
			// 		guildId: guildId,
			// 		adapterCreator: guild.voiceAdapterCreator,
			// 	});
		}
		catch (e) {
			console.error(e)
			await interaction.reply({
				content: _.get(e, 'message', e)
			})
		}
	},
};
