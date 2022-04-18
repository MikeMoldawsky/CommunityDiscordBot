const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { startDateMatchMakerForGuild } = require('../../../logic/tasks/speed-date-match-maker/speed-date-match-maker-task')
const { bootstrapSpeedDateInfrastructureForGuild, startSpeedDateSessionForGuildAndGetInvite } = require("../../../logic/speed-date-manager/speed-date-manager");
const moment = require("moment");
const { startSpeedDateSessionCompleteTask } = require("../../../logic/tasks/speed-date-cleanup/speed-date-cleanup-task");

const ASSIGN_DATES_INTERVAL = 5 * 1000
const MAX_SECONDS_FOR_MATCHING = 15;
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
		const lobbyChannelId = interaction.options.getChannel("lobby") || interaction.channel.id; // TODO: remove default channel ID - it can be dangerous;
		const guildId = interaction.guild.id;
		const guildName = interaction.guild.name;
		const speedDateDurationMinutes = interaction.options.getInteger("duration-capacity") || 1;
		const roomCapacity = interaction.options.getInteger("room-capacity") || 2;
		// TODO: decide how much time we want - maybe configurable
		const matchMakerStopTime = moment().add(MAX_SECONDS_FOR_MATCHING, "seconds").toDate()
		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...

		// 0. Let the bot time to work on the interaction
		// TODO(mike): if the defer is ephemeral=true (as we want) the invite is ephemeral as well!!!!! - WE SHOULD FIX IT WITH delete msg or something
		await interaction.deferReply({ephemeral: false}); // Slash Commands has only 3 seconds to reply to an interaction.


		// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
		try {
			await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity, matchMakerStopTime);
		} catch (e) {
			console.log(`Failed to bootstrap infrastructure for guild ${guildName} with id ${guildId}`);
			await interaction.followUp({
				content: "Failed to start speed dating. Check if there isn't an active round.",
				ephemeral: true, // TODO: doesn't work as ephemeral of the origin msg is false
			});
			return;
		}

		// 2. Start the MatchMaker Task over the Router Channel
		startDateMatchMakerForGuild(guildId, ASSIGN_DATES_INTERVAL)
			.catch(e => console.log(e));

		// 3. Start on complete task over the Router Channel
		startSpeedDateSessionCompleteTask(guildId, ON_COMPLETE_TASK_INTERVAL)
			.catch(e => console.log(e));

		// 4. Allow Speed Daters to join Router Voice Channel with an Invite.
		const routerVoiceChannelInvite = await startSpeedDateSessionForGuildAndGetInvite(guildId, lobbyChannelId);
		console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
		console.log(routerVoiceChannelInvite)
		// We're using editReply - it is required as we're using a deferReply
		await interaction.followUp({
			embeds: [routerVoiceChannelInvite],
			ephemeral: false,
		});
	}
};



