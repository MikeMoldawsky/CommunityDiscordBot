const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const client = require("../../../logic/discord/client");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { assignRound, ASSIGN_INTERVAL, ASSIGN_ROUNDS } = require('../../../logic/speed-date')
const { persistAndGetGuildSpeedDateBot, getGuildSpeedDateBotDocumentOrThrow } = require("../../../logic/db/guild-db-manager");
const { bootstrapSpeedDateInfrastructureForGuild, startSpeedDateSessionForGuildAndGetInvite } = require("../../../logic/speed-date-manager/speed-date-manager");
const { getOrCreateRole } = require("../../../logic/discord/utils");


async function registerOnSpeedDateSessionComplete(guildId, timeOutInMinutes) {
	setTimeout(async () => {
		try {
			// 0. Get state from DB
			const guildSpeedDateBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
			const { activeSpeedDateSession, guildInfo, memberMeetingsHistory } = guildSpeedDateBotDoc;
			if(!activeSpeedDateSession){
				console.log(`Guild ${guildInfo} doesn't have any active speed date session - skipping on-complete operations.`)
				return;
			}

			// 1. Create Speed Date Completed Role & grant to all participated users
			console.log(`Completed Speed Date Round role for ${guildInfo}`)
			const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
					name: `speed-dater`,
				reason: "You deserve a Role as you completed the meeting!",
				color: "RED"
				});
			// TODO: add role to users

			// 2. Delete Router & Voice Channel
			const {routerVoiceChannel, rooms, participants} = activeSpeedDateSession;
			const routerVoiceChannelClient = await client.channels.fetch(routerVoiceChannel.channelId);
			await routerVoiceChannelClient.delete();
			_.forEach(rooms, async ({ voiceChannelId }) => {
				const voiceChannel = await client.channels.fetch(voiceChannelId);
				voiceChannel.delete();
			});

			// 3. Delete temporary speed-dating role for Router
			const guildClient = await client.guilds.fetch(guildId)
			await guildClient.roles.delete(routerVoiceChannel.allowedRoleId);

			// 4. Save participants history and add participation role
			_.forEach(participants, (meetings, userId) => {
				const m = guildClient.members.cache.get(userId)
				m.roles.add(speedDateCompletedRole.id)
				memberMeetingsHistory[userId] = [..._.get(memberMeetingsHistory, userId, []), ...meetings]
			})

			// 5. Save that active session is completed - i.e. delete it
			// TODO - Asaf - do this in single request
			await GuildSpeedDateBot.findOneAndUpdate({guildId}, {memberMeetingsHistory})

			guildSpeedDateBotDoc.activeSpeedDateSession = undefined;

			console.log({guildSpeedDateBotDoc: guildSpeedDateBotDoc.memberMeetingsHistory})

			await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, 'speed date completed');
		} catch (e) {
			console.log(`Failed to perform onComplete operations for ${guildId}`, e)
		}
	}, timeOutInMinutes * 15 * 1000
	);
}

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
		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...

		// 0. Let the bot time to work on the interaction
		await interaction.deferReply({ephemeral: true}); // Slash Commands has only 3 seconds to reply to an interaction.

		// 1. Bootstrap infrastructure that is required for speed dating (Roles, Voice Channel Router etc.)
		try{
			await bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity);
		}catch (e) {
			console.log(`Failed to bootstrap infrastructure for guild ${guildName} with id ${guildId}`);
			await interaction.followUp({
				content: "Failed to start speed dating. Check if there isn't an active round.",
				ephemeral: true,
			});
			return;
		}

		// 2. Start the MatchMaker Task over the Router Channel
		// TODO(Asaf/Mike): here we already know the Voice Channel so we can start a Scheduled Task that will create the rooms for the participants in the Router.

		// 3. Allow Speed Daters to join Router Voice Channel with an Invite.
		const routerVoiceChannelInvite = await startSpeedDateSessionForGuildAndGetInvite(guildId, lobbyChannelId);
		// We're using editReply - it is required as we're using a deferReply
		await interaction.followUp({
			embeds: [routerVoiceChannelInvite],
			ephemeral: false,
		});

		// TODO(mike): Didn't organize yet
		const guildSpeedDateBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);

		// 4. Schedule assigning the rooms
		for (let i = 1; i <= ASSIGN_ROUNDS; i++) {
			setTimeout(() => {
				assignRound(guildId)
			}, i * ASSIGN_INTERVAL)
		}

		// 5. Handle Cleanup after duration time is completed
		// TODO: didn't really do anything here..... NOT SURE if I need await here
		await registerOnSpeedDateSessionComplete(guildId, guildSpeedDateBotDoc.activeSpeedDateSession.speedDateSessionConfig.speedDateDurationMinutes);
	}
};



