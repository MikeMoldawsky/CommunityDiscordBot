const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { MessageEmbed } = require("discord.js");
const client = require("../../../logic/client");
const Round = require("../../../logic/db/models/Round");
const MeetingHistory = require("../../../logic/db/models/MeetingHistory");
const {createVoiceChannel} = require('../../../logic/vcShuffle')
const matchRooms = require('../../../logic/match-rooms')
const { load } = require("nodemon/lib/rules");
const GuildInfo = require("../../../logic/db/models/GuildInfo");
// const RoundSchema = require("./Round");
const mongoose = require("mongoose");
// const RoundSchema = require("./Round");

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
		let routerVoiceChannel = guildClient.channels.cache.find(c => {
			console.log(`${c.name}`)
			return c.name === routerVoiceChannelName;
		});
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


async function addRoleToChannelMembers(guildId, channelId, roleId) {
	try {
		console.log(`Adding role ${roleId} to channel ${channelId}`);
		const guild = await client.guilds.fetch(guildId)
		const channel = await guild.channels.fetch(channelId);
		const fetchedChannel = await channel.fetch(true)

		const members = fetchedChannel.members.filter(
			m => !m.user.bot && m.presence.status !== "offline"
		)
		await Promise.all(members.map(async m => await m.roles.add(roleId)));
		return members
	} catch (e) {
		console.log(`Failed to add Role ${roleId} for Channel ${channelId} members at Guild ${guildId}`);
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

async function createInviteEmbed(voiceChannel, imageUrl) {
	const invite = await voiceChannel.createInvite().catch(console.error);
	return new MessageEmbed()
		.setColor(0x4286f4)
		.setTitle("Your invite to the voice channel")
		.setDescription("It's all about connections")
		.setURL(invite.url)
		.setImage(imageUrl);
}


async function getOrCreateGuildInfoDocument(guildId) {
	try {
		let guildInfo = await GuildInfo.findOne({ guildId: guildId }).exec();
		if (!guildInfo) {
			console.log(`Creating guildInfo for ${guildId}`);
			guildInfo = await GuildInfo.create({
				guildId: guildId,
				config: { imageUrl: "https://i.imgur.com/ZGPxFN2.jpg" },
				activeSpeedDate: undefined,
				speedDatesHistory: [],
				participantsHistory: {}
			});
		} else {
			console.log(`Found guildInfo for ${guildId}`);
		}
		return guildInfo;
	} catch (e) {
		console.log(`Failed to get or create guildInfo for Guild ${guildId}`, e);
	}
}

async function getOrCreateActiveSpeedDate(guildClient, guildInfo) {
	// try {
	// 	if (guildInfo.activeSpeedDate) {
	// 		console.log(`Found an active speed date session ${guildInfo.activeSpeedDate} for guild ${guildInfo.guildId}`);
	// 		return guildInfo.activeSpeedDate;
	// 	} else {
	//
	// 		// 2. Create Protected Voice Channel.
	// 		const voiceRouter = await createRoleProtectedRouterVoiceChannel(guildClient, allowedVoiceRouterRole.id);
	//
	// 		return {
	// 			voiceRouter: voiceRouter,
	// 			round: RoundSchema,
	// 			participantsChannelLobbyId: String,
	// 			allowedVoiceRouterRoleId: allowedVoiceRouterRole.id,
	// 			participants: Object
	//
	//
	// 		}
	// 	// TODO(mike): build Active session
	// 	// STORE to database
	// 	// Return to the USER
	// 		console.log(`${guildInfoactiveSpeedDate} NOT exists`);
	// 	}
	// 	return guildInfoactiveSpeedDate;
	// } catch (e) {
	// 	console.log(`Failed to get or create active speed date for Guild ${guildInfo.guildId}`, e);
	// }
}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("create-voice-lobby")
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
				.setDescription("The capacity of each room."))
		.addStringOption((option) =>
			option
				.setName("invite-image-url")
				.setDescription("The image to embed in the invitation")),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		const channelId = interaction.options.getChannel("lobby") || interaction.channel.id; // TODO: remove default channel ID - it can be dangerous;
		const imageUrl = "https://i.imgur.com/ZGPxFN2.jpg"; // TODO(mike): add imageUrl to config
		const guildId = interaction.guild.id;
		const guildClient = await client.guilds.fetch(guildId)
		const channelClient = await guildClient.channels.fetch(channelId);
		// TODO(mike): add validations over the inputs - e.g. capacity >= 2, guildClient bot found etc...

		const speedDateSessionConfig = {
			lobbyChannelId: channelId,
			lobbyChannelName: channelClient.name,
			speedDateDurationMinutes: interaction.options.getInteger("duration-capacity") || .5,
			roomCapacity: interaction.options.getInteger("room-capacity") || 2
		}


		// 0. Get Or Create Guild Info
		const guildInfoDocument = await getOrCreateGuildInfoDocument(guildId);
		console.log(`${guildInfoDocument}`);

		if(guildInfoDocument.activeSpeedDateSession){
			console.log(`Active speed date session found - can't start a new session for ${guildId}`);
			await interaction.reply({
				content: "There is an active speed date in progress.\nTrigger end-speed-date command before starting a new session.\n Or run update-speed-date",
				ephemeral: true,
			});
			return;
		} else {
			console.log(`Creating speed date session for ${guildId}`);
			guildInfoDocument.activeSpeedDateSession = {
				speedDateSessionConfig: speedDateSessionConfig
			};
			await guildInfoDocument.save();
			guildInfoDocument.activeSpeedDateSession.routerVoiceChannel = await createRoleProtectedRouterVoiceChannel(guildClient, guildId);
			await guildInfoDocument.save();
		}











	// 1. Check if there's an active bot session
	// 	getOrCreateActiveSpeedDate(guildInfo.activeSpeedDate, guildId);

		// const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
		// 	name: `speed-dater`,
		// 	reason: "You deserve a Role as you completed the meeting!",
		// 	color: "RED"
		// });
		// const members = await addRoleToChannelMembers(guild, channel.id, allowedVoiceRouterRole.id);

		// // 1. Create Protected Voice Channel.
		// const voiceRouterChannel = await getOrCreateRouterVoiceChannel(interaction.guild, allowedVoiceRouterRole.id);
		//
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
		// // 4. Send invite to Voice Staging Channel
		// const inviteEmbed = await createInviteEmbed(voiceRouterChannel, imageUrl);
		// await interaction.reply({
		// 	embeds: [inviteEmbed],
		// });
		//
		// setTimeout(() => {
		// 	_.forEach(rooms, async ({ channelId }) => {
		// 		const voiceChannel = await client.channels.fetch(channelId);
		// 		await voiceChannel.delete();
		// 	});
		// 	voiceRouterChannel.delete()
		// 	allowedVoiceRouterRole.delete()
		// 	round.status = 'complete'
		// 	round.save()
		// 	// todo - decide who is considered a participant and award with a role
		// 	addRoleToChannelMembers(guild, channel.id, speedDateCompletedRole.id)
		// 	}, duration * 60 * 1000
		// );
	}
};


