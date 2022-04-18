const { MessageEmbed } = require("discord.js");
const { getOrCreateRole } = require("./utils");

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
			.setTitle(config.title || "Your invite to the voice channel")
			.setDescription(config.description || "It's all about connections")
			.setImage(config.image)
			.setURL(invite.url);
	} catch (e) {
		console.log(`Failed to create Router Voice Channel invite`, e)
	}
}


module.exports = {
	createRoleProtectedRouterVoiceChannel,
	createRouterVoiceChannelInvite
}
