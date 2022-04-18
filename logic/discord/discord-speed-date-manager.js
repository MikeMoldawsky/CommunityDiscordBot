const { MessageEmbed } = require("discord.js");
const { getOrCreateRole } = require("./utils");
const { getGuildWithActiveSpeedDateSessionOrThrow } = require("../../../logic/db/guild-db-manager");
const client = require("../../../logic/discord/client");
const music = require("@koenie06/discord.js-music");

const ROUTER_VOICE_LOBBY_NAME = "❤️ Speed Date Lobby ❤️";

async function getOrCreateProtectedRouterVoiceChannel(guildClient, roleId, creatorId) {
	try {
		// TODO - should NOT find the router by the name but from DB through the ID
		let routerVoiceChannel = guildClient.channels.cache.find(c => c.name === ROUTER_VOICE_LOBBY_NAME);
		if(routerVoiceChannel){
			console.log(`Found existing Router Voice Channel ${ROUTER_VOICE_LOBBY_NAME} for guild ${guildClient.id}`)
			return routerVoiceChannel
		} else {
			console.log(`Creating Router Voice Channel ${ROUTER_VOICE_LOBBY_NAME} for guild ${guildClient.id}`)
			return await guildClient.channels.create(ROUTER_VOICE_LOBBY_NAME, {
				type: "GUILD_VOICE",
				reason: "Staging lobby for speed dating :)",
				permissionOverwrites: [
					{ id: guildClient.id, deny: ["VIEW_CHANNEL", "CONNECT", "SPEAK"] }, // deny
					{ id: roleId, allow: ["VIEW_CHANNEL", "CONNECT"] }, // allow role
					{ id: creatorId, allow: ["SPEAK"] }, // allow creator to speak
				]
			});
		}
	} catch (e) {
		console.log(`Failed to create Router Voice Channel ${ROUTER_VOICE_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
		throw Error(`Failed to create Router Voice Channel ${ROUTER_VOICE_LOBBY_NAME} for guild ${guildClient.id}, ${e}`)
	}
}


async function createRoleProtectedRouterVoiceChannel(guild, guildId, creatorId) {
	try {
		console.log(`Creating Voice Channel Router for Guild ${guildId}`);
		// Create dedicated role to protect the voice router channel from uninvited users
		const allowedVoiceRouterRole = await getOrCreateRole(guildId, {
			name: `speed-dating-participant`,
			reason: "Active speed-dating round participant",
			color: "GOLD"
		});
		// Create voice router channel
		const routerVoiceChannel = await getOrCreateProtectedRouterVoiceChannel(guild, allowedVoiceRouterRole.id, creatorId);
		return {
			routerData: {
				allowedRoleId: allowedVoiceRouterRole.id,
				allowedRoleName: allowedVoiceRouterRole.name,
				channelId: routerVoiceChannel.id,
				channelName: routerVoiceChannel.name
			},
			routerChannel: routerVoiceChannel,
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

async function playMusicInRouterVoiceChannel(interaction, guildId) {
	try {
		const { config: {voiceLobby: { music : musicConfig }},  guildInfo, activeSpeedDateSession: { routerVoiceChannel } } = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
		const guildClient = await client.guilds.fetch(guildId);
		const routerChannel =  await guildClient.channels.fetch(routerVoiceChannel.channelId);

		console.log(`Staring music for guild ${guildInfo.guildName} with id ${guildId} - ${musicConfig.url}`);
		await music.play({
			interaction: interaction,
			channel: routerChannel,
			song: musicConfig.url || 'https://soundcloud.com/julian_avila/elevatormusic',
		});
		await music.volume({
			interaction: interaction,
			volume: musicConfig.volume,
		});
	} catch (e) {
		console.log(`Failed to play music for guild ${guildId}`, e);
		throw Error(`Failed to play music for guild ${guildId}, ${e}`)
	}
}


module.exports = {
	createRoleProtectedRouterVoiceChannel,
	createRouterVoiceChannelInvite,
	playMusicInRouterVoiceChannel
}
