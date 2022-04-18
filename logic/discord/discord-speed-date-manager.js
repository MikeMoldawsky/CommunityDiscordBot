const { MessageEmbed } = require("discord.js");
const { getOrCreateRole } = require("./utils");
const music = require('@koenie06/discord.js-music');

async function getOrCreateProtectedRouterVoiceChannel(guildClient, roleId, interaction) {
	const routerVoiceChannelName = "Router Voice Lobby";
	try {
		let routerVoiceChannel = guildClient.channels.cache.find(c => c.name === routerVoiceChannelName);
		if(routerVoiceChannel){
			console.log(`Found existing Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
			return routerVoiceChannel
		} else {
			console.log(`Creating Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
			const router = await guildClient.channels.create(routerVoiceChannelName, {
				type: "GUILD_VOICE",
				reason: "Staging lobby for speed dating :)",
				permissionOverwrites: [
					{ id: guildClient.id, deny: ["VIEW_CHANNEL", "CONNECT"] }, // deny
					// { id: roleId, allow: ["CONNECT"] }, // allow role
					{ id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] } // allow role
				]
			});

			const song = 'https://www.youtube.com/watch?v=VBlFHuCzPgY'
			music.play({
				interaction: interaction,
				channel: router,
				song: song
			});

			return router
		}
	} catch (e) {
		console.log(`Failed to create Router Voice Channel ${routerVoiceChannelName} for guild ${guildClient.id}`)
	}
}


async function createRoleProtectedRouterVoiceChannel(guild, guildId, interaction) {
	try {
		console.log(`Creating Voice Channel Router for Guild ${guildId}`);
		// Create dedicated role to protect the voice router channel from uninvited users
		const allowedVoiceRouterRole = await getOrCreateRole(guildId, {
			name: `speed-dating-participant`,
			reason: "Active speed-dating round participant",
			color: "GOLD"
		});
		// Create voice router channel
		const routerVoiceChannel = await getOrCreateProtectedRouterVoiceChannel(guild, allowedVoiceRouterRole.id, interaction);
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


module.exports = {
	createRoleProtectedRouterVoiceChannel,
	createRouterVoiceChannelInvite
}
