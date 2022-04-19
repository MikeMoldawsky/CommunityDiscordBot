const { SlashCommandBuilder } = require("@discordjs/builders");
const { updateBotConfigIfNeeded } = require("../../../logic/speed-date-config-manager/speed-date-config-manager");
const moment = require("moment");
const { bootstrapSpeedDateInfrastructureForGuild, startSpeedDateSessionForGuildAndGetInvite,
	startSpeedDateRoundAndGetInvite
} = require("../../../logic/speed-date-manager/speed-date-manager");
const { playMusicInRouterVoiceChannel } = require("../../../logic/discord/discord-speed-date-manager");
const { startDateMatchMakerForGuild } = require("../../../logic/tasks/speed-date-match-maker/speed-date-match-maker-task");
const { startSpeedDateSessionCompleteTask } = require("../../../logic/tasks/speed-date-cleanup/speed-date-cleanup-task");
const { getOrCreateGuildSpeedDateBotDocument, throwIfActiveSession, getGuildWithActiveSpeedDateSessionOrThrow } = require("../../../logic/db/guild-db-manager");

const MATCH_MAKER_INTERVAL = 5 * 1000
const MATCH_MAKER_TASK_DELAY = 30 * 1000;
const MAX_SECONDS_FOR_MATCHING = 60;
const ON_COMPLETE_TASK_INTERVAL = 10 * 1000


async function configure(interaction){
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

async function initialize(interaction){
	let lobbyChannelId, guildId, guildName, speedDateDurationMinutes, roomCapacity;
	try {
		guildId = interaction.guild.id;
		guildName = interaction.guild.name;
		lobbyChannelId = interaction.options.getChannel("lobby") || interaction.channel.id; // TODO: remove default channel ID - it can be dangerous;
		speedDateDurationMinutes = interaction.options.getInteger("duration") || 2;
		roomCapacity = interaction.options.getInteger("room-capacity") || 2;
		// TODO: decide how much time we want - maybe configurable
		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...
		// 0. Let the bot time to work on the interaction
		// TODO(mike): if the defer is ephemeral=true (as we want) the invite is ephemeral as well!!!!! - WE SHOULD FIX IT WITH delete msg or something
	} catch (e) {
		console.log(`Failed to start speed dating - input errors`, e);
		throw Error(`Failed to start speed dating - input errors ${e}`);
	}
	try {
		// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
		const matchMakerStopTime = moment().add(MAX_SECONDS_FOR_MATCHING, "seconds").toDate()
		await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity, matchMakerStopTime, interaction.user.id);
		await playMusicInRouterVoiceChannel(interaction, guildId);
	} catch (e){
		console.log(`Failed to initialize speed dating`, e);
		throw Error(`Failed to initialize speed dating ${e}`);
	}
}

async function startRoundAndGetInvite(interaction){
	const guildId = interaction.guild.id;
	try {
		// 1. Start the MatchMaker Task over the Router Channel
		const {  activeSpeedDateSession: { routerVoiceChannel }} = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);

		startDateMatchMakerForGuild(guildId, MATCH_MAKER_INTERVAL)
			.catch(e => console.log(e));
		return await startSpeedDateSessionForGuildAndGetInvite(guildId);
	} catch (e) {
		console.log(`Failed to start speed-date for with id ${guildId}`, e);
		throw Error(`Failed to start speed-date for with id ${guildId} ${e}`);
	}
}

async function close(interaction){

}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("speed-date")
		.setDescription(
			"Let's you configure things like the router lobby invitation, and music"
		)
		.addSubcommand(
			subCommand => subCommand.setName("configure")
				.setDescription(
					"Let's you configure things like the router lobby invitation, and music"
				)
				.addStringOption(option => option.setName('invite-image-url').setDescription("The image url of the speed date's router lobby voice channel invite"))
				.addStringOption(option => option.setName('invite-title').setDescription("The title of the speed date's router lobby voice channel invite"))
				.addStringOption(option => option.setName('invite-description').setDescription("The description of the speed date's router lobby voice channel invite"))
				.addStringOption(option => option.setName('music-url').setDescription("The music that will be played in the speed date's router lobby voice channel"))
				.addIntegerOption(option => option.setName('music-volume').setDescription("The music volume that will be played in the speed date's router lobby voice channel"))
		)
		.addSubcommand(
			subCommand => subCommand.setName("initialize")
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
		)
		.addSubcommand(
			subCommand => subCommand.setName("start-round")
				.setDescription(
					"Let's you configure things like the router lobby invitation, and music"
				)
				.addIntegerOption(option => option.setName('music-volume').setDescription("The music volume that will be played in the speed date's router lobby voice channel"))
		)
		.addSubcommand(
			subCommand => subCommand.setName("close")
				.setDescription(
					"close speed date session"
				)
				.addIntegerOption(option => option.setName('music-volume').setDescription("The music volume that will be played in the speed date's router lobby voice channel"))
		),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();
		const guildId = interaction.guild.id;
		const guildName = interaction.guild.name;
		try {
			console.log(`>>>>>>>>>> EXECUTING COMMAND ${subcommand} - START`, {guildName, guildId});
			switch (subcommand) {
				case 'configure':
					await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
					await configure(interaction);
					break;
				case 'initialize':
					await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
					await initialize(interaction);
					break;
				case 'start-round':
					await interaction.deferReply({ephemeral: false}); // Slash Commands has only 3 seconds to reply to an interaction.
					const routerVoiceChannelInvite = await startSpeedDateRoundAndGetInvite(guildId, MATCH_MAKER_INTERVAL, MATCH_MAKER_TASK_DELAY);
					// TODO: check if we want to send invite on every round
					await interaction.followUp({ embeds: [routerVoiceChannelInvite], ephemeral: false,});
					break;
				case 'close':
					await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.
					await close(interaction);
					break;
				default:
					throw Error(`Unknown subcommand: ${subcommand}`);
			}
			console.log(`<<<<<<<<<< EXECUTING COMMAND ${subcommand} - SUCCESS`, {guildName, guildId});
			await interaction.followUp({
				content: `Successfully executed speed-date subcommand ${subcommand}.`,
				ephemeral: true,
			});
		}	catch (e) {
			console.log(`<<<<<<<<<< EXECUTING COMMAND ${subcommand} - FAILED`, {guildName, guildId}, e);
			await interaction.followUp({
				content: `Failed to execute speed-date subcommand ${subcommand}.`,
				ephemeral: true
			});
		}
	}
};


