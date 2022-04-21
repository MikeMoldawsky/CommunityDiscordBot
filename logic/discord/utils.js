const _ = require("lodash");
const client = require("./client");



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

async function addRoleToChannelMembers(guildClient, channelClient, roleId) {
	try {
		console.log(`Adding role ${roleId} to channel ${channelClient} members`);
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
	} catch (e) {
		console.log(`Failed to add Role ${roleId} for Channel ${channelClient.id} members at Guild ${guildClient.id}`, e);
	}
}


module.exports = {
	getOrCreateRole,
	addRoleToChannelMembers
}