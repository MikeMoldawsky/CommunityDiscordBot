const { SlashCommandBuilder } = require("@discordjs/builders");
const { getOrCreateGuildSpeedDateBotDocument, deleteActiveSessionForGuild } = require("../../../logic/db/guild-db-manager");
const _ = require("lodash");
const { cleanUpSpeedDateForGuild } = require("../../../logic/tasks/speed-date-cleanup-task/speed-date-cleanup-manager");

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("delete-speed-date-active-session")
		.setDescription(
			"Debug command - deletes the current active speed date seesion"
		).addBooleanOption(option => option.setName('are-you-sure').setDescription("extra safety check"))
	,
	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		const guildId = interaction.guild.id;
		const guildName = interaction.guild.name;

		// 0. Let the bot time to work on the interaction
		await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.

		const areYouSure = interaction.options.getBoolean("are-you-sure");
		if(!areYouSure){
			console.log(`Not deleting active session for guild ${guildName} with ${guildId} - user didn't pass extra security check flag...`);
			await interaction.followUp({
				content: "Not deleting active session - please pass extra security check flag ...",
				ephemeral: true,
			});
			return;
		}
		// 1. Delete active session
		try {
			await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
			await cleanUpSpeedDateForGuild(guildId);
			await deleteActiveSessionForGuild(guildId)
		} catch (e) {
			console.log(`Can't delete active speed date session for guild for guild ${guildName} with ${guildId}`, e);
			await interaction.followUp({
				content: "Failed to delete active speed date session...",
				ephemeral: true,
			});
			return;
		}

		await interaction.followUp({
			content: "Successfully removed active session.",
			ephemeral: true,
		});
	}
};



