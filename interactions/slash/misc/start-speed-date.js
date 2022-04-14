const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { MessageEmbed } = require("discord.js");
const client = require("../../../logic/client");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { assignRound, ASSIGN_INTERVAL, ASSIGN_ROUNDS } = require('../../../logic/speed-date')

const DEFAULT_INVITE_IMAGE_URL = "https://i.imgur.com/ZGPxFN2.jpg";

async function getOrCreateRole(guildId, roleInfo) {
	try {
		console.log(`Creating role ${roleInfo.name}`);
		const guild = await client.guilds.fetch(guildId);
		// TODO replace roleName with roleId
		let role = guild.roles.cache.find(r => r.name === roleInfo.name);
		if(!role){
			role = await guild.roles.create(roleInfo);
			console.log(`Role was created ${roleInfo.name}`);
		}
		else {
			console.log(`Role already exists ${roleInfo.name}`);
		}
		return role
	} catch (e) {
		console.log(`Failed to create Role ${roleInfo} for Guild ${guildId}`);
	}
}

async function getOrCreateProtectedRouterVoiceChannel(guildClient, roleId) {
	const routerVoiceChannelName = "Router Voice Lobby";
	try {
		let routerVoiceChannel = guildClient.channels.cache.find(c => c.name === routerVoiceChannelName);
		if(routerVoiceChannel){
			console.log(`Found existing Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
			return routerVoiceChannel
		} else {
			console.log(`Creating Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
			return await guildClient.channels.create(routerVoiceChannelName, {
				type: "GUILD_VOICE",
				reason: "Staging lobby for speed dating :)",
				permissionOverwrites: [
					{ id: guildClient.id, deny: ["VIEW_CHANNEL", "CONNECT"] }, // deny
					// { id: roleId, allow: ["CONNECT"] }, // allow role
					{ id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] } // allow role
				]
			});
		}
	} catch (e) {
		console.log(`Failed to create Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
	}
}


async function addRoleToChannelMembers(guildClient, channelClient, roleId) {
	try {
		console.log(`Adding role ${roleId} to channel ${channelClient}`);
		const forcedChannelClient = await channelClient.fetch(true) // TODO(mike): ask Asaf why do we need force fetch?
		const members = forcedChannelClient.members.filter(
			member => {
				const isBot = _.get(member, "user.bot", false)
				// TODO(mike): talk to Asaf - we had a bug here as presence can be null.
				// I think that we can give to all the Role to be safe as the creating rooms only happens at router level,
				// const isOnline = _.get(member, "presence.status") === "online";
				if(isBot){
					console.log(`Skipped adding role to user ${member.user}`)
				}
				return !isBot;
			}
		)
		await Promise.all(members.map(async m => await m.roles.add(roleId)));
		return members
	} catch (e) {
		console.log(`Failed to add Role ${roleId} for Channel ${channelClient.id} members at Guild ${guildClient.id}`, e);
	}
}

async function createRoleProtectedRouterVoiceChannel(guild, guildId) {
	try {
		console.log(`Creating Voice Channel Router for Guild ${guildId}`);
		// Create dedicated role to protect the voice router channel from uninvited users
		const allowedVoiceRouterRole = await getOrCreateRole(guildId, {
			name: `speed-dating-participant`,
			reason: "Active speed-dating round participant",
			color: "GOLD"
		});
		// Create voice router channel
		const routerVoiceChannel = await getOrCreateProtectedRouterVoiceChannel(guild, allowedVoiceRouterRole.id);
		return {
			allowedRoleId: allowedVoiceRouterRole.id,
			allowedRoleName: allowedVoiceRouterRole.name,
			channelId: routerVoiceChannel.id,
			channelName: routerVoiceChannel.name
		};
	} catch (e) {
		console.log(`Failed to create Voice Router Channel for Guild ${guild.id}`, e);
	}
}

async function createRouterVoiceChannelInvite(routerVoiceChannelClient, config) {
	try {
		console.log(`Creating Router Voice Channel invite`);
		const invite = await routerVoiceChannelClient.createInvite();
		return new MessageEmbed()
			.setColor(0x4286f4)
			.setTitle("Your invite to the voice channel")
			.setDescription("It's all about connections")
			.setURL(invite.url)
			.setImage(config.imageUrl);
	} catch (e) {
			console.log(`Failed to create Router Voice Channel invite`, e)
	}
}


async function getGuildSpeedDateBotDocumentOrThrow(guildId, guildName) {
	const guildInfo = await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
	if (!guildInfo) {
		console.log(`GuildInfo for guild ${guildName} with id ${guildId}`);
		throw Error(`Guild ${guildName} with id ${guildId} should have existing bot configurations`);
	}
	return guildInfo;
}

async function getOrCreateGuildSpeedDateBotDocument(guildId, guildName) {
	try {
		let guildInfo = await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
		if (guildInfo) {
			console.log(`Found speed date bot configurations for guild ${guildName} with id ${guildId}`);
			return guildInfo;
		}
		console.log(`Creating guildInfo for guild ${guildName} with id ${guildId}`);
		return await GuildSpeedDateBot.create({
				guildInfo: {
					guildId: guildId,
					guildName: guildName,
				},
				config: { imageUrl: DEFAULT_INVITE_IMAGE_URL },
				activeSpeedDate: undefined,
				// speedDatesHistory: [],
				// participantsHistory: {},
			});
	} catch (e) {
		console.log(`Failed to get or create guildInfo for guild ${guildName} with id ${guildId}`, e);
	}
}

async function persistAndGetGuildSpeedDateBot(guildInfoDocument, updateReason) {
	try{
		console.log(`Updating GuildInfo in DB for guild ${guildInfoDocument.guildName} with id ${guildInfoDocument.guildId} - ${updateReason}`)
		return await guildInfoDocument.save();
	} catch (e) {
		console.log(`Failed to update DB for guild ${guildInfoDocument.guildName} with id ${guildInfoDocument.guildId}`, e)
	}
}

async function initializeSpeedDateSession(guildClient, guildSpeedDateBotDoc, speedDateSessionConfig) {
	const {guildInfo: {guildId, guildName} } = guildSpeedDateBotDoc;
	try {
		console.log(`Initializing speed date session for guild ${guildName} with id ${guildId}`);
		// 0. Persist active session config before creating actual objects (roles, channels etc.)
		// Helps to avoid a bad state (e.g. if we crashed while creating roles but didn't persist).
		guildSpeedDateBotDoc.activeSpeedDateSession = {
			speedDateSessionConfig: speedDateSessionConfig
		};
		await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed date session config update");
		// 1. Creating router voice channel
		guildSpeedDateBotDoc.activeSpeedDateSession.routerVoiceChannel = await createRoleProtectedRouterVoiceChannel(guildClient, guildId);
		return await persistAndGetGuildSpeedDateBot(guildSpeedDateBotDoc, "speed router voice channel update");
	} catch (e) {
		console.log(`Failed to initializeSpeedDateSession for ${guildName} with id ${guildId}`, e)
	}
}

async function startSpeedDateSession(interaction, guildClient, lobbyChannelClient, guildSpeedDateBotDoc) {
	try {
		console.log(`Starting speed date session for guild ${guildSpeedDateBotDoc.guildInfo} with config ${guildSpeedDateBotDoc.activeSpeedDateSession}`);
		const {activeSpeedDateSession: {routerVoiceChannel}, config } = guildSpeedDateBotDoc;
		const routerVoiceChannelClient = await guildClient.channels.fetch(routerVoiceChannel.channelId);

		// 1. Allow members to join Router Voice Channel
		//TODO: Do we  actually need the members roles?
		const allowedRouterChannelMembers = await addRoleToChannelMembers(guildClient, lobbyChannelClient, routerVoiceChannel.allowedRoleId);

		// 2. Create invite to join Router Voice Channel
		const routerVoiceChannelInvite = await createRouterVoiceChannelInvite(routerVoiceChannelClient, config);

		// 3. Send invite to all allowed Router Voice Channel members.
		await interaction.reply({
			embeds: [routerVoiceChannelInvite],
		});
		console.log(`Successfully started speed date session for ${guildSpeedDateBotDoc.guildInfo}`);
	} catch (e) {
		console.log(`Failed to start speed date session for ${guildSpeedDateBotDoc.guildInfo} with config ${guildSpeedDateBotDoc.activeSpeedDateSession}`);
	}
}

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

			// 3. Save participants history
			_.forEach(participants, (meetings, userId) => {
				memberMeetingsHistory[userId] = [..._.get(memberMeetingsHistory, userId, []), ...meetings]
			})

			// 4. Delete temporary speed-dating role for Router
			const guildClient = await client.guilds.fetch(guildId)
			await guildClient.roles.delete(routerVoiceChannel.allowedRoleId);

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
		const channelId = interaction.options.getChannel("lobby") || interaction.channel.id; // TODO: remove default channel ID - it can be dangerous;
		const guildId = interaction.guild.id;
		const guildName = interaction.guild.name;

		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...

		// Creating clients
		const guildClient = await client.guilds.fetch(guildId)
		const lobbyChannelClient = await guildClient.channels.fetch(channelId);

		// 0. Get Or Create Guild Speed Date Document
		let prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
		// 1. Active Session check as multiple sessions aren't allowed (should be fixed manually or with bot commands).
		if(prevGuildSpeedDateBotDoc.activeSpeedDateSession){


			// TODO - remove temp code for DEV
			await prevGuildSpeedDateBotDoc.delete()
			prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);

			// console.log(`Active speed date session found - can't start a new session for ${guildId}`);
			// await interaction.reply({
			// 	content: "There is an active speed date in progress.\nTrigger end-speed-date command before starting a new session.\n Or run update-speed-date",
			// 	ephemeral: true,
			// });
			// return;
		}

		// 2. Initialize Speed Date Infrastructure - Roles, Router, DB etc...
		const speedDateSessionConfig = {
			lobbyChannelId: channelId,
			lobbyChannelName: lobbyChannelClient.name,
			speedDateDurationMinutes: interaction.options.getInteger("duration-capacity") || 1,
			roomCapacity: interaction.options.getInteger("room-capacity") || 2
		}
		const guildSpeedDateBotDoc = await initializeSpeedDateSession(guildClient, prevGuildSpeedDateBotDoc, speedDateSessionConfig);

		// TODO(Asaf/Mike): here we already know the Voice Channel so we can start a Scheduled Task that will create the rooms for the participants in the Router.

		// From Here - only use the DB objects to build other objects.
		// 3. Allow Speed Daters to join Router Voice Channel with an Invite.
		await startSpeedDateSession(interaction, guildClient, lobbyChannelClient, guildSpeedDateBotDoc);

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

// TODO(asaf): Drafts that will probably help you

	// // 2. Randomize groups and create voice channels
	// // const groups = _.chunk(_.shuffle(Array.from(members.keys())), roomCapacity)
	// const history = await MeetingHistory.findOne({ guildId: guild.id })
	// // console.log({historyBefore: history})
	// const { rooms: groups } = matchRooms(Array.from(members.keys()), history, roomCapacity)
	// // const { rooms: groups } = matchRooms(Array.from(members.keys()), history, roomCapacity)
	// // todo - handle clear history logic
	//
	// console.log({ history, groups })
	//
	// const rooms = await Promise.all(
	// 	_.map(groups, async (group, i) => {
	// 		const roomNumber = i + 1;
	// 		const vc = await createVoiceChannel(guild, roomNumber, group);
	// 		return {
	// 			number: roomNumber,
	// 			participants: group,
	// 			channelId: vc.id
	// 		};
	// 	})
	// );

	// // 3. Add to DB
	// const round = new Round({
	// 	creator: interaction.user.id,
	// 	guildId: interaction.guild.id,
	// 	channelId: channel.id,
	// 	lobbyId: voiceRouterChannel.id,
	// 	roleId: allowedVoiceRouterRole.id,
	// 	startTime: new Date(),
	// 	duration,
	// 	roomCapacity,
	// 	rooms,
	// 	imageUrl,
	// })
	//
	// await round.save();
	//



