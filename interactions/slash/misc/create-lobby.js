const { SlashCommandBuilder } = require("@discordjs/builders");
const _ = require("lodash");
const { MessageEmbed } = require("discord.js");

async function getOrCreateRole(client, guildId, roleName) {
	console.log(`Creating role ${roleName}`);
	const guild = await client.guilds.fetch(guildId);
	// TODO check if role exists in active session in database, if so return.
	if(true){
		const role = await guild.roles.create({
			name: roleName,
			// unicodeEmoji: "🫂",
			reason: "You deserve a Role as you completed the meeting!",
			color: "GOLD"
		});
		console.log(`Role was created ${roleName}`);
		return role
	}
	console.log(`Role already exists ${roleName}`);
	// TODO: fetch role and return
	return null;
}


async function addRoleToChannelMembers(client, channelId, roleId) {
	console.log(`Adding role ${roleId} to user ${channelId}`);
	const channel = await client.channels.fetch(channelId);
	await Promise.all(await channel.members.filter(m => {
		// console.log({ m })
		return !m.user.bot && m.presence.status !== "offline";
	}).map(member => {
		member.roles.add(roleId);
		console.log(`Successfully added role ${roleId} to user ${member.id}`);
	}));
}


	async function getOrCreateRouterVoiceChannel(guild, roleId) {
		// TODO: get from DB if exists
		return guild.channels.create(`Router Voice Lobby`, {
			type: "GUILD_VOICE",
			reason: "Staging lobby for speed dating :)",
			permissionOverwrites: [
				{ id: guild.id, deny: ["VIEW_CHANNEL", "CONNECT"] }, // deny
				{ id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] }, // allow role
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
		// 0. Create dedicated role to protect the voice staging lobby channel from
		// uninvited users
		const role = await getOrCreateRole(interaction.client, interaction.guild.id, "speed-dating");
		const lobby = interaction.options.getChannel("lobby");
		await addRoleToChannelMembers(interaction.client, lobby.id, role.id);

		// 1. Create Protected Voice Channel.
		const voiceRouterChannel = await getOrCreateRouterVoiceChannel(interaction.guild, role.id);

		// 2. Send invite to Voice Staging Channel
		const inviteEmbed = await createInviteEmbed(voiceRouterChannel);
		await interaction.reply({
			embeds: [inviteEmbed],
		});
	}
};


