const client = require("../discord/client");
const { getOrCreateGuildSpeedDateBotDocument, getGuildWithActiveSessionOrThrow, updatedRoundConfig } = require("../db/guild-db-manager");
const { addRoleToChannelMembers } = require("../discord/utils");
const { createRouterVoiceChannelInvite } = require("../discord/discord-speed-date-manager");
const { initializeSpeedDateSessionForGuild } = require("../speed-date-bootstraper/speed-date-bootstrapper");
const { startDateMatchMakerTaskWithDelay } = require("../tasks/speed-date-match-maker/speed-date-match-maker-task");
const { startSpeedDateRoundTerminatorTask } = require("../tasks/speed-date-round-terminator/speed-date-round-terminator-task");
const moment = require("moment");


async function bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, speedDateDurationMinutes, lobbyChannelId, roomCapacity, creatorId) {
	// Creating clients
	const guildClient = await client.guilds.fetch(guildId);
	const lobbyChannelClient = await guildClient.channels.fetch(lobbyChannelId);
	// 0. Get Or Create Guild Speed Date Document
	let prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
	// 1. Active Session check as multiple sessions aren't allowed (should be fixed manually or with bot commands).
	if(prevGuildSpeedDateBotDoc.activeSession){
		// TODO: uncomment for dev
		// await prevGuildSpeedDateBotDoc.delete()
		// prevGuildSpeedDateBotDoc = await getOrCreateGuildSpeedDateBotDocument(guildId, guildName);
		console.log(`Active speed date session found - can't start a new session for ${guildId}`);
		throw Error(`There is an active speed date in progress for ${guildId}.`);
	}
	await initializeSpeedDateSessionForGuild(prevGuildSpeedDateBotDoc, guildClient, lobbyChannelClient, speedDateDurationMinutes, roomCapacity, creatorId);
}

async function allowMembersJoinLobbyAndGetInvite(guildId, invitedMemberChannelId, routerLobbyChannelId, allowedJoinRoleId, inviteConfig) {
	// Creating clients
	const guildClient = await client.guilds.fetch(guildId);
	const invitedMemberChannelClient = await guildClient.channels.fetch(invitedMemberChannelId);
	const routerLobbyChannelClient = await guildClient.channels.fetch(routerLobbyChannelId);
	try {
		// 1. Allow members to join Router Voice Channel
		//TODO: Do we  actually need the members roles?
		console.log(`Speed Date GRANT VIEW LOBBY ROLE to invited members`, {guildId, invitedMemberChannelId, routerLobbyChannelId});
		const allowedRouterChannelMembers = await addRoleToChannelMembers(guildClient, invitedMemberChannelClient, allowedJoinRoleId);
		// 2. Create invite to join Router Voice Channel
		console.log(`Speed Date CREATE ROUTER LOBBY INVITE`, {guildId});
		return await createRouterVoiceChannelInvite(routerLobbyChannelClient, inviteConfig);
	} catch (e) {
		console.log(`ALLOW MEMBER JOIN LOBBY FAILED - ${guildId}`, e);
		throw new Error(`ALLOW MEMBER JOIN LOBBY FAILED - ${guildId}, ${e}`);
	}
}

async function startSpeedDatesAndGetInvite(guildId, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds, dateTerminatorInterval){
	let activeSpeedDateBotDoc;
	try {
		activeSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e){
		console.log("SPEED DATE ROUND - START - FAILED - active speed date session not found", {guildId}, e);
	}
	const {activeSession: { routerVoiceChannel: {allowedRoleId, channelId }, sessionConfig: { lobbyChannelId, speedDateDurationMinutes}},
		config: { voiceLobby: { invite }}, guildInfo } = activeSpeedDateBotDoc;

	// 1. Update speed date Round configurations
	try {
		const startTime = moment().toDate();
		await updatedRoundConfig(guildId, startTime, speedDateDurationMinutes);
	} catch (e) {
		console.log("SPEED DATE ROUND - START - FAILED - failed to update round config", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`SPEED DATE ROUND - START - FAILED - failed to update round config ${guildId}, ${e}`)
	}

	console.log(`Speed Date INVITE MEMBERS for guild ${guildInfo}`);
	await startDateMatchMakerTaskWithDelay(guildId, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds)
		.catch(e => console.log(e));
	await startSpeedDateRoundTerminatorTask(guildId, dateTerminatorInterval)
		.catch(e => console.log(e));
	return await allowMembersJoinLobbyAndGetInvite(guildId, lobbyChannelId, channelId, allowedRoleId, invite);
}


module.exports = {
	bootstrapSpeedDateInfrastructureForGuild,
	startSpeedDatesAndGetInvite
}