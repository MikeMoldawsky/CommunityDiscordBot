const { SlashCommandBuilder } = require("@discordjs/builders");
const { startDateMatchMakerForGuild } = require('../../../logic/tasks/speed-date-match-maker/speed-date-match-maker-task')
const { bootstrapSpeedDateInfrastructureForGuild, startSpeedDateSessionForGuildAndGetInvite } = require("../../../logic/speed-date-manager/speed-date-manager");
const moment = require("moment");
const { startSpeedDateSessionCompleteTask } = require("../../../logic/tasks/speed-date-cleanup/speed-date-cleanup-task");
const { playMusicInRouterVoiceChannel } = require("../../../logic/discord/discord-speed-date-manager");

const ASSIGN_DATES_INTERVAL = 5 * 1000
const MAX_SECONDS_FOR_MATCHING = 60;
const ON_COMPLETE_TASK_INTERVAL = 10 * 1000


module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("start-speed-date")
		.setDescription(
			"Creates a voice lobby for routing."
		)
		.addChannelOption(option => option.setName('lobby').setDescription("The participants channel"))
		.addIntegerOption((option) =>
			option
				.setName("duration")
				.setDescription("The meeting duration in minutes."))
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
		let lobbyChannelId, guildId, guildName, speedDateDurationMinutes, roomCapacity;
		try {
		 lobbyChannelId = interaction.options.getChannel("lobby") || interaction.channel.id; // TODO: remove default channel ID - it can be dangerous;
		 guildId = interaction.guild.id;
		 guildName = interaction.guild.name;
		 speedDateDurationMinutes = interaction.options.getInteger("duration") || 2;
		 roomCapacity = interaction.options.getInteger("room-capacity") || 2;
		// TODO: decide how much time we want - maybe configurable
		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...
		// 0. Let the bot time to work on the interaction
		// TODO(mike): if the defer is ephemeral=true (as we want) the invite is ephemeral as well!!!!! - WE SHOULD FIX IT WITH delete msg or something
			await interaction.deferReply({ephemeral: false}); // Slash Commands has only 3 seconds to reply to an interaction.
		} catch (e) {
			console.log(`Failed to start start speed dating - input errors`, e);
			await interaction.reply({
				content: "Failed to start speed dating - input errors.",
				ephemeral: true
			});
			return;
		}

		try {
			// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
				const matchMakerStopTime = moment().add(MAX_SECONDS_FOR_MATCHING, "seconds").toDate()
				await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity, matchMakerStopTime, interaction.user.id);

				await playMusicInRouterVoiceChannel(interaction, guildId);

			// 2. Start the MatchMaker Task over the Router Channel
			startDateMatchMakerForGuild(guildId, ASSIGN_DATES_INTERVAL)
				.catch(e => console.log(e));

			// 3. Start on complete task over the Router Channel
			startSpeedDateSessionCompleteTask(guildId, ON_COMPLETE_TASK_INTERVAL)
				.catch(e => console.log(e));

			// 4. Allow Speed Daters to join Router Voice Channel with an Invite.
			const routerVoiceChannelInvite = await startSpeedDateSessionForGuildAndGetInvite(guildId);
			// We're using editReply - it is required as we're using a deferReply
			await interaction.followUp({
				embeds: [routerVoiceChannelInvite],
				ephemeral: false,
			});
		} catch (e) {
			console.log(`Failed to start speed-date for ${guildName} with id ${guildId}`, e);
			await interaction.followUp({
				content: "Failed to start speed dating.",
				ephemeral: true
			});
		}
	}
};



