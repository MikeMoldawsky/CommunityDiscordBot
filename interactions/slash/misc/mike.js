/**
 * @file Sample help command with slash command.
 * @author Naman Vrati
 * @author Thomas Fournier <thomas@artivain.com>
 * @since 3.0.0
 * @version 3.1.0
 */

// Deconstructed the constants we need in this file.

const { MessageEmbed, Collection } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { stringify } = require("nodemon/lib/utils");

function createRole(interaction) {
	return interaction.guild.roles.create({
		name: "Community Meeting Completed",
		// unicodeEmoji: "🫂",
		reason: "You deserve a Role as you completed the meeting!",
		color: "GOLD"
	});
}

function createVoiceChannel(interaction) {
	return interaction.guild.channels.create(
		interaction.options.getString("name") || "no-name"
		, { type: "GUILD_VOICE", reason: "Let's connect and get to know each other :)" });
}

async function onMeetingCompleted(interaction, voiceChannelId, meetingCompletedRole) {
	// passing the voiceChannelId and not the object as we need the up to date members
	const voiceChannel = await interaction.client.channels.fetch(voiceChannelId);
	console.log("#########################################")

	Promise.all(voiceChannel.members.map(member => {
		console.log(`adding role to member ${member.user}`);
		return member.roles.add(meetingCompletedRole);
	}))
		.then((_values) => {
			_values.forEach(member => `added role to member ${member}`);
			console.log("Successfully added roles to users");
			return voiceChannel.delete("Meeting has ended");
		}).then((_deletedChannel) =>
		console.log("Successfully deleted the channel")
	).catch(console.log);
}

async function createInviteEmbed(voiceChannel) {
	const invite = await voiceChannel.createInvite({targetUser: 840986538157932554}).catch(console.error);
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
		.setName("create-room")
		.setDescription(
			"Creates a new room."
		)
		.addIntegerOption((option) =>
			option
				.setName("duration")
				.setDescription("The meeting duration in minutes."))
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription("The specific channel name.")
		),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		// 0. Create Role that will be granted to users that attended the meeting or get it as input
		// 1. Create tuples from members interaction.channel.members - i.e. random meetings
		//   a. Notice that interaction.channel.members returns only online members - we might need to change it to all members
		// 2. Open Private Channel for every tuple & add them (and the bot?).
		// 3. Close channel after X minutes.
		// 4. Grant Role when the meetings ends

		// ===================================== 0. Create Role ==================================================
		const meetingCompletedRole = await createRole(interaction);

		// ===================================== 1. Create Tuples ==================================================


		// ===================================== 2. Create Channel ==================================================
		const voiceChannel = await createVoiceChannel(interaction);

		// Create an invite to a channel
		// Replies to the interaction with the voice channel url.
		// We might add the users without an invite, but it might feel weird from a UI perspective - we can decide later on.
		const inviteEmbed = await createInviteEmbed(voiceChannel);
		await interaction.reply({
			embeds: [inviteEmbed],
		});

		const duration = (interaction.options.getInteger("duration") || 1 ) * 60 * 1000; // default of 1 min for testing
		setTimeout( () => onMeetingCompleted(interaction, voiceChannel.id, meetingCompletedRole), duration)
	},
};
