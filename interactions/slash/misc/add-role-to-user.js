const { SlashCommandBuilder } = require("@discordjs/builders");

async function getOrCreateRole(client, guildId, roleName) {
	console.log(`Creating role ${roleName}`);
	const guild = await client.guilds.fetch(guildId);
	// TODO check if role exists
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


async function addRoleToUser(client, guildId, roleId, userId) {
	console.log(`Adding role ${roleId} to user ${userId}`);
	const guild = await client.guilds.fetch(guildId);
	const guildMember = await guild.members.fetch(userId);
	await guildMember.roles.add(roleId);
	console.log(`Successfully added role ${roleId} to user ${userId}`);
}

module.exports = {
	// The data needed to register slash commands to Discord.
	data: new SlashCommandBuilder()
		.setName("add-role-to-user")
		.setDescription(
			"Adds a new role to the user."
		)
		.addStringOption((option) =>
			option
				.setName("role-name")
				.setDescription("The specific role name to add to the user.")
		).addUserOption(option => option.setName('user').setDescription('Select a user')),

	/**
	 * @description Executes when the interaction is called by interaction handler.
	 * @author Naman Vrati
	 * @author Thomas Fournier <thomas@artivain.com>
	 * @param {*} interaction The interaction object of the command.
	 */

	async execute(interaction) {
		const roleName = interaction.options.getString("role-name");
		const role = await getOrCreateRole(interaction.client, interaction.guild.id, roleName);
		const user = interaction.options.getUser("user");
		// intentionally working with ids & not the interaction
		await addRoleToUser(interaction.client, interaction.guild.id, role.id, user.id);
	}
};
