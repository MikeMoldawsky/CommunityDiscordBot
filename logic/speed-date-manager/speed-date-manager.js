const client = require("../discord/client");
const { getGuildSpeedDateBotDocumentOrThrow, getOrCreateGuildSpeedDateBotDocument } = require("../db/guild-db-manager");
const { addRoleToChannelMembers } = require("../discord/utils");
const { createRouterVoiceChannelInvite } = require("../discord/discord-speed-date-manager");
const { initializeSpeedDateSessionForGuild } = require("../speed-date-bootstraper/speed-date-bootstrapper");

async function bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity, matchMakerStopTime, creatorId) {
	// Creating clients
	const guildClient = await client.guilds.fetch(guildId);
	const lobbyChannelClient = await guildClient.channels.fetch(lobbyChannelId);
	// 0. Get Or Create Guild Speed Date Document
	let prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
	// 1. Active Session check as multiple sessions aren't allowed (should be fixed manually or with bot commands).
	if(prevGuildSpeedDateBotDoc.activeSpeedDateSession){
		// TODO: uncomment for dev
		// await prevGuildSpeedDateBotDoc.delete()
		// prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
		console.log(`Active speed date session found - can't start a new session for ${guildId}`);
		throw Error(`There is an active speed date in progress for ${guildId}.`);
	}
	return await initializeSpeedDateSessionForGuild(prevGuildSpeedDateBotDoc, guildClient, lobbyChannelClient, speedDateDurationMinutes, roomCapacity, matchMakerStopTime, creatorId);
}

async function startSpeedDateSessionForGuildAndGetInvite(guildId, lobbyChannelId) {
	try {
		const {activeSpeedDateSession, config, guildInfo }  = await getGuildSpeedDateBotDocumentOrThrow(guildId);
		console.log(`Starting speed date session for guild ${guildInfo} with config ${activeSpeedDateSession}`);
		// Creating clients
		const guildClient = await client.guilds.fetch(guildId);
		const lobbyChannelClient = await guildClient.channels.fetch(lobbyChannelId);
		const routerVoiceChannelClient = await guildClient.channels.fetch(activeSpeedDateSession.routerVoiceChannel.channelId);

		// 1. Allow members to join Router Voice Channel
		//TODO: Do we  actually need the members roles?
		const allowedRouterChannelMembers = await addRoleToChannelMembers(guildClient, lobbyChannelClient, activeSpeedDateSession.routerVoiceChannel.allowedRoleId);

		// 2. Create invite to join Router Voice Channel
		const routerVoiceChannelInvite = await createRouterVoiceChannelInvite(routerVoiceChannelClient, config);
		console.log(`Successfully started speed date session for ${guildInfo}`);
		return routerVoiceChannelInvite;
	} catch (e) {
		console.log(`Failed to start speed date session for guild ${guildId}`, e);
		throw new Error(`Failed to start speed date session for guild ${guildId}`);
	}
}

module.exports = {
	bootstrapSpeedDateInfrastructureForGuild,
	startSpeedDateSessionForGuildAndGetInvite
}