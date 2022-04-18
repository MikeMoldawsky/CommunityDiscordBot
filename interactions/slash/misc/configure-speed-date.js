const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { throwIfActiveSession, updatedConfigFieldsForGuild, getOrCreateGuildSpeedDateBotDocument } = require("../../../logic/db/guild-db-manager");

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("configure-speed-date")
		.setDescription(
			"Let's you configure things like the router lobby invitation, and music"
		)
		.addStringOption(option => option.setName('invite-image-url').setDescription("The image url of the speed date's router lobby voice channel")),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		const guildId = interaction.guild.id;
		const guildName = interaction.guild.name;

		// 0. Let the bot time to work on the interaction
		await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.

		const inviteImageUrl = interaction.options.getString("invite-image-url");

		if(!inviteImageUrl){
			console.log(`Not updating configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			await interaction.followUp({
				content: "No configuration parameters were passed...",
				ephemeral: true,
			});
			return;
		}

		// 1. Don't allow configure while active speed dating
		try {
			await throwIfActiveSession(guildId)
			await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
			await updatedConfigFieldsForGuild(guildId, inviteImageUrl)
		} catch (e) {
			console.log(`Can't update configuration while active speed date for guild ${guildName} with ${guildId}`, e);
				await interaction.followUp({
					content: "Failed to configure speed dating. Check if there is an active round...",
					ephemeral: true,
			});
			return;
		}


		await interaction.followUp({
			content: "Successfully updated the speed date configurations.",
			ephemeral: true,
		});
	}
};



