const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateMusicIfNeeded, updateInviteIfNeeded } = require("../../../logic/speed-date-config-manager/speed-date-config-manager");
const { bootstrapSpeedDateInfrastructureForGuild, startSpeedDateRound, getLobbyInvite,
	isCommunityBotAdmin, openLobbyForRole, endSpeedDateRound
} = require("../../../logic/speed-date-manager/speed-date-manager");
const {
	DEFAULT_SPEED_DATE_DURATION_MINUTES,
	DEFAULT_ROOM_CAPACITY,
	MATCH_MAKER_DURATION_PERCENTAGE,
	MATCH_MAKER_INTERVAL,
	MATCH_MAKER_TASK_DELAY,
	ROUND_TERMINATOR_TASK_INTERVAL,
} = require('../../../logic/config/appconf.prod')
const { playMusicInLobby, reloadMusicInLobbyIfInActiveSession } = require('../../../logic/discord/discord-music-player')
const { endSpeedDateSession } = require("../../../logic/speed-date-session-terminator/speed-date-session-cleanup-manager");

// Sub Commands
const LOBBY_GROUP_COMMAND = "lobby";
const LOBBY_INITIALIZE_SUBCOMMAND = 'initialize';
const LOBBY_POST_INVITE_SUBCOMMAND = 'post-invite';
const LOBBY_OPEN_SUBCOMMAND = 'open';
const LOBBY_DESTROY_SUBCOMMAND = 'destroy';
// Round Commands
const ROUND_GROUP_COMMAND = 'round';
const ROUND_START_SUBCOMMAND = 'start';
const ROUND_END_SUBCOMMAND = 'end';
// Configure Command
const CONFIGURE_GROUP_SUBCOMMAND = 'configure';
const CONFIGURE_MUSIC_SUBCOMMAND = 'music';
const CONFIGURE_INVITE_SUBCOMMAND = 'invite';

async function configureInvite(interaction){
	const guildId = interaction.guild.id;
	const guildName = interaction.guild.name;
	const inviteImageUrl = interaction.options.getString("image-url");
	const inviteTitle = interaction.options.getString("title");
	const inviteText = interaction.options.getString("description");
	try {
		await updateInviteIfNeeded(guildId, guildName, inviteImageUrl, inviteTitle, inviteText);
	} catch (e) {
		console.log(`Can't update invite configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Failed to configure invite. Check if there is an active round..., ${e}`);
	}
}

async function configureMusic(interaction){
	const guildId = interaction.guild.id;
	const guildName = interaction.guild.name;
	const musicUrl = interaction.options.getString("url");
	const musicVolume = interaction.options.getInteger("volume");
	try {
		await updateMusicIfNeeded(guildId, guildName, musicUrl, musicVolume);
		await reloadMusicInLobbyIfInActiveSession(guildId);
	} catch (e) {
		console.log(`Can't update music configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Failed to configure music. Check if there is an active round..., ${e}`);
	}
}

async function initializeLobby(interaction){
	let guildId, guildName;
	try {
		guildId = interaction.guild.id;
		guildName = interaction.guild.name;
		const rewardPlayersRole = interaction.options.getRole('reward-players');
		// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
		await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, rewardPlayersRole);
		await playMusicInLobby(guildId)
	} catch (e){
		console.log(`Failed to initialize speed dating`, {guildId, guildName, e});
		throw Error(`Failed to initialize speed dating for guild ${guildName} ${e}`);
	}
}

async function openLobby(interaction){
	let guildId, guildName, allowedRole;
	try {
		guildId = interaction.guild.id;
		guildName = interaction.guild.name;
		allowedRole = interaction.options.getRole('role');
		await openLobbyForRole(guildId, guildName, allowedRole);
	} catch (e){
		console.log(`Failed to open the speed date lobby`, {guildId, guildName, allowedRole, e});
		throw Error(`Failed to open the speed date lobby of guild ${guildName} to role ${allowedRole} ${e}`);
	}
}

async function getInviteToLobby(interaction) {
	let guildId;
	try {
		guildId = interaction.guild.id;
		const invitedChannelId = interaction.channel.id;
		// 1. Allow channel members to join lobby and send invite
		return await getLobbyInvite(guildId, invitedChannelId);
	} catch (e){
		console.log(`Failed to send invite for speed dating`, {guildId, e});
		throw Error(`Failed to send invite for speed dating for guild ${guildId} ${e}`);
	}
}

async function startRound(interaction) {
	let guildId, roomCapacity, speedDateDurationMinutes;
	try {
		guildId = interaction.guild.id;
		// TODO - enable this after testing capacity > 2
		// roomCapacity = interaction.options.getInteger("room-capacity") || DEFAULT_ROOM_CAPACITY;
		roomCapacity = DEFAULT_ROOM_CAPACITY;
		speedDateDurationMinutes = interaction.options.getInteger("duration") || DEFAULT_SPEED_DATE_DURATION_MINUTES;
	} catch (e) {
		console.log(`Failed to start round - input errors`, e);
		throw Error(`Failed to start round - input errors ${e}`);
	}
	try {
		const matchMakerDurationSeconds = speedDateDurationMinutes * 60 * MATCH_MAKER_DURATION_PERCENTAGE
		await startSpeedDateRound(guildId, speedDateDurationMinutes, roomCapacity, MATCH_MAKER_INTERVAL, MATCH_MAKER_TASK_DELAY, matchMakerDurationSeconds, ROUND_TERMINATOR_TASK_INTERVAL);
	} catch (e){
		console.log(`Failed to start round for speed dating`, {guildId, e});
		throw Error(`Failed to start round for speed dating for guild ${guildId} ${e}`);
	}
}

async function endRound(interaction) {
	let guildId, guildName;
	try {
		guildId = interaction.guild.id;
		guildName = interaction.guild.name;
		console.log(`End round - START`, {guildId, guildName});
		await endSpeedDateRound(guildId);
	} catch (e){
		console.log(`End round - FAILED`, {guildId, guildName, e});
		throw Error(`End round - FAILED - guild ${guildName}, id ${guildId} ${e}`);
	}
}

function isEphemeral(groupCommand, subCommand){
	return !(groupCommand === LOBBY_GROUP_COMMAND && subCommand === LOBBY_POST_INVITE_SUBCOMMAND);
}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("connecto")
		// .setDefaultPermission(false)
		.setDescription(
			"Helps you CREATE MEETINGS for your community. You'll get a STRONGER and HEALTHIER community!"
		)
		.addSubcommandGroup(subCommandGroup => subCommandGroup.setName(LOBBY_GROUP_COMMAND).setDescription("Speed date session commands")
			.addSubcommand(
				subCommand => subCommand.setName(LOBBY_INITIALIZE_SUBCOMMAND)
					.setDescription(
						"Creates the voice channel lobby for the speed dates session - the lobby is protected by a role."
					)
					.addRoleOption(option => option.setName('reward-players').setDescription("A role assigned to all of the speed-daters."))
			)
			.addSubcommand(
				subCommand => subCommand.setName(LOBBY_POST_INVITE_SUBCOMMAND)
					.setDescription(
						"Post the date's session invite in this channel."
					)
			)
			.addSubcommand(
				subCommand => subCommand.setName(LOBBY_OPEN_SUBCOMMAND)
					.setDescription(
						"Opens the speed date lobby for the specified role."
					)
					.addRoleOption(option => option.setName('role').setDescription("Allows to view & join the lobby.").setRequired(true))
			)
			.addSubcommand(
				subCommand => subCommand.setName(LOBBY_DESTROY_SUBCOMMAND)
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
							.setDescription("The meeting duration in minutes.")
							.setRequired(true))
					// TODO - enable this after testing capacity > 2
					// .addIntegerOption((option) =>
					// 	option
					// 		.setName("room-capacity")
					// 		.setDescription("The capacity of each room."))
			)
				.addSubcommand(
					subCommand => subCommand.setName(ROUND_END_SUBCOMMAND)
						.setDescription(
							"End the round ahead of time! Be Careful When Using This Command."
						)
				)
		)
		.addSubcommandGroup(subCommandGroup => subCommandGroup.setName(CONFIGURE_GROUP_SUBCOMMAND).setDescription("Speed date configure commands")
			.addSubcommand(
				subCommand => subCommand.setName(CONFIGURE_MUSIC_SUBCOMMAND)
					.setDescription(
						"Let's you configure things the lobby music"
					)
					.addStringOption(option => option.setName('url').setDescription("The music that will be played in the speed date's lobby voice channel"))
					.addIntegerOption(option => option.setName('volume').setDescription("The music volume that will be played in the speed date's lobby voice channel"))
			)
				.addSubcommand(
					subCommand => subCommand.setName(CONFIGURE_INVITE_SUBCOMMAND)
						.setDescription(
							"Let's you configure things the lobby invitation."
						)
						.addStringOption(option => option.setName('image-url').setDescription("The image url of the speed date's lobby voice channel invite"))
						.addStringOption(option => option.setName('title').setDescription("The title of the speed date's lobby voice channel invite"))
						.addStringOption(option => option.setName('description').setDescription("The description of the speed date's lobby voice channel invite"))
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
			const ephemeral = isEphemeral(groupCommand, subcommand);
			await interaction.deferReply({ ephemeral }); // Slash Commands has only 3 seconds to reply to an interaction.
			const isBotAdmin = await isCommunityBotAdmin(interaction.member, guildId, guildName);
			if(!isBotAdmin){
					await interaction.followUp({
						content: "💀 Failed - you're not a bot admin!💀",
						ephemeral: true
					});
					return;
			}
			console.log(`>>>>>>>>>> EXECUTING COMMAND - START`, {guildName, guildId, groupCommand, subcommand });
			switch (groupCommand) {
				case LOBBY_GROUP_COMMAND:
					switch (subcommand) {
						case LOBBY_INITIALIZE_SUBCOMMAND:
							await initializeLobby(interaction);
							break;
						case LOBBY_POST_INVITE_SUBCOMMAND:
							const lobbyChannelInvite = await getInviteToLobby(interaction);
							await interaction.followUp({ embeds: [lobbyChannelInvite], ephemeral: false,});
							break;
						case LOBBY_OPEN_SUBCOMMAND:
							await openLobby(interaction);
							break;
						case LOBBY_DESTROY_SUBCOMMAND:
							await endSpeedDateSession(guildId).catch(e => console.log(e));
							break;
						default:
							throw Error(`Unknown ${groupCommand} subcommand: ${subcommand}`);
					}
					break;
				case ROUND_GROUP_COMMAND:
					switch (subcommand) {
						case ROUND_START_SUBCOMMAND:
							await startRound(interaction);
							break;
						case ROUND_END_SUBCOMMAND:
							await endRound(interaction);
							break;
						default:
							throw Error(`Unknown ${groupCommand} subcommand: ${subcommand}`);
					}
					break;
				case CONFIGURE_GROUP_SUBCOMMAND:
					switch (subcommand) {
						case CONFIGURE_INVITE_SUBCOMMAND:
							await configureInvite(interaction);
							break;
						case CONFIGURE_MUSIC_SUBCOMMAND:
							await configureMusic(interaction);
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



