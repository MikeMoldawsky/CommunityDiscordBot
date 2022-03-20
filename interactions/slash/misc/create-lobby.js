const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { MessageEmbed } = require("discord.js");
const client = require("../../../logic/client");
const Round = require("../../../logic/db/models/Round");
const {createVoiceChannel} = require('../../../logic/vcShuffle')

async function getOrCreateRole(guildId, roleName) {
	console.log(`Creating role ${roleName}`);
	const guild = await client.guilds.fetch(guildId);
	// TODO replace roleName with roleId
	let role = guild.roles.cache.find(r => r.name === roleName);
	if(!role){
		role = await guild.roles.create({
			name: roleName,
			reason: "You deserve a Role as you completed the meeting!",
			color: "GOLD"
		});
		console.log(`Role was created ${roleName}`);
	}
	else {
		console.log(`Role already exists ${roleName}`);
	}
	return role
}

async function addRoleToChannelMembers(guildId, channelId, roleId) {
	console.log(`Adding role ${roleId} to channel ${channelId}`);
	const guild = await client.guilds.fetch(guildId)
	const channel = await guild.channels.fetch(channelId);
	const fetchedChannel = await channel.fetch(true)

	const members = fetchedChannel.members.filter(
		m => !m.user.bot && m.presence.status !== "offline"
	)
	console.log('MEMBERS: ', members.size)

	await Promise.all(
		members.map(async m => {
			await m.roles.add(roleId)
		})
	)

	return members
}

async function getOrCreateRouterVoiceChannel(guild, roleId) {
	// TODO: get from DB if exists
	return guild.channels.create(`Router Voice Lobby`, {
		type: "GUILD_VOICE",
		reason: "Staging lobby for speed dating :)",
		permissionOverwrites: [
			{ id: guild.id, deny: ["VIEW_CHANNEL", "CONNECT"] }, // deny
			{ id: roleId, allow: ["CONNECT"] }, // allow role
			// { id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] }, // allow role
		]
	})
}

async function createInviteEmbed(voiceChannel) {
	const invite = await voiceChannel.createInvite().catch(console.error);
	return new MessageEmbed()
		.setColor(0x4286f4)
		.setTitle("Your invite to the voice channel")
		.setDescription("It's all about connections")
		.setURL(invite.url)
		.setImage("https://i.imgur.com/ZGPxFN2.jpg");
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
				.setDescription("The capacity of each room.")),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		// 0. Create dedicated role to protect the voice staging lobby channel from uninvited users
		const role = await getOrCreateRole(interaction.guild.id, "speed-dating");
		const channel = interaction.options.getChannel("lobby") || interaction.channel;
		// console.log({channel, role})
		const guild = await client.guilds.fetch(interaction.guild.id)
		const members = await addRoleToChannelMembers(guild, channel.id, role.id);

		// 1. Create Protected Voice Channel.
		const voiceRouterChannel = await getOrCreateRouterVoiceChannel(interaction.guild, role.id);

		// 2. Randomize groups and create voice channels
		const duration = interaction.options.getInteger("duration-capacity") || .25
		const roomCapacity = interaction.options.getInteger("room-capacity") || 1
		const groups = _.chunk(_.shuffle(Array.from(members.keys())), roomCapacity)
		const rooms = await Promise.all(
			_.map(groups, async (group, i) => {
				const roomNumber = i + 1;
				const vc = await createVoiceChannel(guild, roomNumber, group);
				return {
					number: roomNumber,
					participants: group,
					channelId: vc.id
				};
			})
		);

		// 3. Add to DB
		const round = new Round({
			creator: interaction.user.id,
			guildId: interaction.guild.id,
			channelId: channel.id,
			lobbyId: voiceRouterChannel.id,
			roleId: role.id,
			startTime: new Date(),
			duration,
			roomCapacity,
			rooms,
		})

		await round.save();

		// 4. Send invite to Voice Staging Channel
		const inviteEmbed = await createInviteEmbed(voiceRouterChannel);
		await interaction.reply({
			embeds: [inviteEmbed],
		});

		setTimeout(() => {
			_.forEach(rooms, async ({ channelId }) => {
				const voiceChannel = await client.channels.fetch(channelId);
				await voiceChannel.delete();
			});
			voiceRouterChannel.delete()
			round.status = 'complete'
			round.save()
		}, duration * 60 * 1000)
	}
};


