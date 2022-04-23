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

async function addRoleToMembers(guildClient, allowedChannelId, allowedUserId, roleId) {
	console.log(`Adding Role`, {guildId: guildClient.id, allowedChannelId, allowedUserId, roleId});
	let members = [];
	try {
		if(allowedChannelId){
			console.log(`Adding role to ALL CHANNEL members`, {allowedChannelId, roleId});
			const channelClient = await guildClient.channels.fetch(allowedChannelId);
			const forcedChannelClient = await channelClient.fetch(true) // TODO(mike): ask Asaf why do we need force fetch?
			members = forcedChannelClient.members.filter(
				member => {
					const isBot = _.get(member, "user.bot", false)
					if(isBot){
						console.log(`Skipped adding role to user ${member.user}`)
					}
					return !isBot;
				}
			)
			await Promise.all(members.map(async m => await m.roles.add(roleId)));
		}
		if(allowedUserId){
			console.log(`Adding role to SINGLE MEMBER`, {allowedUserId, roleId});
			const allowedMember = await guildClient.members.fetch(allowedUserId);
			await allowedMember.roles.add(roleId);
		}
	} catch (e) {
		console.log(`Failed to add Role`, {guildId: guildClient.id, allowedChannelId, allowedUserId, roleId} ,e);
		throw Error(`Failed to add Role for channel members at guild: ${guildClient.id}, channel: ${allowedChannelId} ${e}`);
	}
}


module.exports = {
	getOrCreateRole,
	addRoleToMembers
}