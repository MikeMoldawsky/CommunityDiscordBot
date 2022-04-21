const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateBotConfigIfNeeded } = require("../../../logic/speed-date-config-manager/speed-date-config-manager");
const { bootstrapSpeedDateInfrastructureForGuild, allowMembersJoinLobbyAndGetInvite,
	startSpeedDateRound
} = require("../../../logic/speed-date-manager/speed-date-manager");
const { playMusicInLobby } = require("../../../logic/discord/discord-speed-date-manager");
const { getOrCreateGuildSpeedDateBotDocument, throwIfActiveSession } = require("../../../logic/db/guild-db-manager");
const { endSpeedDateSessionTask } = require("../../../logic/tasks/speed-date-session-cleanup/speed-date-session-cleanup-manager");
const _ = require("lodash");

// Sub Commands
const SESSION_GROUP_COMMAND = "session";
const SESSION_CONFIGURE_SUBCOMMAND = 'configure';
const SESSION_INITIALIZE_SUBCOMMAND = 'initialize';
const SESSION_INVITE_SUBCOMMAND = 'invite';
const SESSION_END_SUBCOMMAND = 'end';
// Round Commands
const ROUND_GROUP_COMMAND = 'round';
const ROUND_START_SUBCOMMAND = 'start';

// DEFAULT PARAMS
const DEFAULT_SPEED_DATE_DURATION_MINUTES = 3;
const DEFAULT_ROOM_CAPACITY = 2;
// Match Maker
const MATCH_MAKER_INTERVAL = 10 * 1000 // check for matches every 10 seconds
const MATCH_MAKER_TASK_DELAY = 5 * 1000; // start matching after 5 seconds
const MATCH_MAKER_DURATION_SECONDS = 60; // match in the first 60 seconds
// ROUND TERMINATOR
const ROUND_TERMINATOR_TASK_INTERVAL = 10 * 1000

async function configureSession(interaction){
	const guildId = interaction.guild.id;
	const guildName = interaction.guild.name;
	const inviteImageUrl = interaction.options.getString("invite-image-url");
	const inviteTitle = interaction.options.getString("invite-title");
	const inviteText = interaction.options.getString("invite-description");
	const musicUrl = interaction.options.getString("music-url");
	const musicVolume = interaction.options.getInteger("music-volume");
	try {
		// 1. Don't allow configure while active speed dating
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		await throwIfActiveSession(guildId)
		await updateBotConfigIfNeeded(guildId, guildName, inviteImageUrl, inviteTitle, inviteText, musicUrl, musicVolume);
	} catch (e) {
		console.log(`Can't update configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Failed to configure speed dating. Check if there is an active round..., ${e}`);
	}
}


async function initializeSession(interaction){
	let guildId, guildName;
	try {
		guildId = interaction.guild.id;
		guildName = interaction.guild.name;
		// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
		await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, interaction.user.id);
		await playMusicInLobby(interaction, guildId);
	} catch (e){
		console.log(`Failed to initialize speed dating`, e);
		throw Error(`Failed to initialize speed dating ${e}`);
	}
}

async function allowJoinSessionLobbyAndSendInvite(interaction) {
	let invitedChannelId, guildId;
	try {
		guildId = interaction.guild.id;
		invitedChannelId = interaction.options.getChannel("invited-channel") || interaction.channel.id;
	} catch (e) {
		console.log(`Failed to send invite for session - input errors`, e);
		throw Error(`Failed to send invite for session - input errors ${e}`);
	}
	try {
		// 1. Allow channel members to join lobby and send invite
		return await allowMembersJoinLobbyAndGetInvite(guildId, invitedChannelId);
	} catch (e){
		console.log(`Failed to send invite for speed dating`, {guildId, e});
		throw Error(`Failed to send invite for speed dating for guild ${guildId} ${e}`);
	}
}

async function startRound(interaction) {
	let guildId, roomCapacity, speedDateDurationMinutes;
	try {
		guildId = interaction.guild.id;
		roomCapacity = interaction.options.getInteger("room-capacity") || DEFAULT_ROOM_CAPACITY;
		speedDateDurationMinutes = interaction.options.getInteger("duration") || DEFAULT_SPEED_DATE_DURATION_MINUTES;
	} catch (e) {
		console.log(`Failed to start round - input errors`, e);
		throw Error(`Failed to start round - input errors ${e}`);
	}
	try {
		await startSpeedDateRound(guildId, speedDateDurationMinutes, roomCapacity, MATCH_MAKER_INTERVAL, MATCH_MAKER_TASK_DELAY, MATCH_MAKER_DURATION_SECONDS, ROUND_TERMINATOR_TASK_INTERVAL);
	} catch (e){
		console.log(`Failed to start round for speed dating`, {guildId, e});
		throw Error(`Failed to start round for speed dating for guild ${guildId} ${e}`);
	}
}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("speed-date")
		.setDescription(
			"Helps you CREATE MEETINGS for your community. You'll get a STRONGER and HEALTHIER community!"
		)
		.addSubcommandGroup(subCommandGroup => subCommandGroup.setName(SESSION_GROUP_COMMAND).setDescription("Speed date session commands")
				.addSubcommand(

				subCommand => subCommand.setName(SESSION_CONFIGURE_SUBCOMMAND)
					.setDescription(
						"Let's you configure things like the speed date lobby invitation, and music etc."
					)
					.addStringOption(option => option.setName('invite-image-url').setDescription("The image url of the speed date's lobby voice channel invite"))
					.addStringOption(option => option.setName('invite-title').setDescription("The title of the speed date's lobby voice channel invite"))
					.addStringOption(option => option.setName('invite-description').setDescription("The description of the speed date's lobby voice channel invite"))
					.addStringOption(option => option.setName('music-url').setDescription("The music that will be played in the speed date's lobby voice channel"))
					.addIntegerOption(option => option.setName('music-volume').setDescription("The music volume that will be played in the speed date's lobby voice channel"))
			)
			.addSubcommand(
				subCommand => subCommand.setName(SESSION_INITIALIZE_SUBCOMMAND)
					.setDescription(
						"Creates the voice channel lobby for the speed dates session."
					)
			)
			.addSubcommand(
				subCommand => subCommand.setName(SESSION_INVITE_SUBCOMMAND)
					.setDescription(
						"Allow the channel's member to join the speed-date session lobby."
					)
					.addChannelOption(option => option.setName('invited-channel').setDescription("The invited channel members")),
			)
			.addSubcommand(
				subCommand => subCommand.setName(SESSION_END_SUBCOMMAND)
					.setDescription(
						"Ends the speed date session! Be Careful When Using This Command."
					)
			)
		)
		.addSubcommandGroup(subCommandGroup => subCommandGroup.setName(ROUND_GROUP_COMMAND).setDescription("Speed date round commands")
			.addSubcommand(
				subCommand => subCommand.setName(ROUND_START_SUBCOMMAND)
					.setDescription(
						"Start matching speed-daters from the lobby into private voice channels."
					)
					.addIntegerOption((option) =>
						option
							.setName("duration")
							.setDescription("The meeting duration in minutes."))
					.addIntegerOption((option) =>
						option
							.setName("room-capacity")
							.setDescription("The capacity of each room."))
			)
		),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		let groupCommand, subcommand, guildId, guildName;
		try {
			groupCommand = interaction.options.getSubcommandGroup();
			subcommand = interaction.options.getSubcommand();
			guildId = interaction.guild.id;
			guildName = interaction.guild.name;
			console.log(`>>>>>>>>>> EXECUTING COMMAND - START`, {guildName, guildId, groupCommand, subcommand });
			switch (groupCommand) {
				case SESSION_GROUP_COMMAND:
					switch (subcommand) {
						case SESSION_CONFIGURE_SUBCOMMAND:
							await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
							await configureSession(interaction);
							break;
						case SESSION_INITIALIZE_SUBCOMMAND:
							await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
							await initializeSession(interaction);
							break;
						case SESSION_INVITE_SUBCOMMAND:
							await interaction.deferReply({ephemeral: false}); // Slash Commands has only 3 seconds to reply to an interaction.
							const lobbyChannelInvite = await allowJoinSessionLobbyAndSendInvite(interaction);
							await interaction.followUp({ embeds: [lobbyChannelInvite], ephemeral: false,});
							break;
						case SESSION_END_SUBCOMMAND:
							await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
							await endSpeedDateSessionTask(guildId).catch(e => console.log(e));
							break;
						default:
							throw Error(`Unknown ${groupCommand} subcommand: ${subcommand}`);
					}
					break;
				case ROUND_GROUP_COMMAND:
					switch (subcommand) {
						case ROUND_START_SUBCOMMAND:
							await interaction.deferReply({ephemeral: false}); // Slash Commands has only 3 seconds to reply to an interaction.
							await startRound(interaction);
							break;
						default:
							throw Error(`Unknown ${groupCommand} subcommand: ${subcommand}`);
					}
					break;
				default:
					throw Error(`Unknown group command: ${groupCommand}`);
			}
			console.log(`<<<<<<<<<< EXECUTING COMMAND - SUCCESS`, {guildName, guildId, groupCommand, subcommand});
			await interaction.followUp({
				content: `🎉 Successfully execute ${groupCommand} ${subcommand}. 🎉`,
				ephemeral: true,
			});
		}	catch (e) {
			console.log(`<<<<<<<<<< EXECUTING COMMAND - FAILED`, {guildName, guildId, groupCommand, subcommand}, e);
			await interaction.followUp({
				content: `💀 Failed to execute ${groupCommand} ${subcommand}. 💀`,
				ephemeral: true
			});
		}
	}
};



