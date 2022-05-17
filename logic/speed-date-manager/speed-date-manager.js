const client = require("../discord/client");
const { getGuildWithActiveSessionOrThrow, updatedRoundConfig, isActiveSpeedDateSession } = require("../db/guild-db-manager");
const { createLobbyInvite, getOrCreateCommunityBotAdminRoleAndPersistIfNeeded } = require("../discord/discord-speed-date-manager");
const { initializeSpeedDateSessionForGuild } = require("../speed-date-bootstraper/speed-date-bootstrapper");
const { startDateMatchMakerTaskWithDelay } = require("../tasks/speed-date-match-maker-task");
const { startSpeedDateRoundTerminatorTask } = require("../tasks/speed-date-round-terminator-task");
const moment = require("moment");


async function bootstrapSpeedDateInfrastructureForGuild(guildId, guildName, creatorId, protectLobbyRole, memberRewardRole = undefined, keepInLobbyRole = undefined) {
	// 0. Active Session check as multiple sessions aren't allowed (should be fixed manually or with bot commands).
	if(await isActiveSpeedDateSession(guildId)){
		console.log(`Active speed date session found - can't start a new session for ${guildId}`);
		throw Error(`There is an active speed date in progress for ${guildId}.`);
	}
	await initializeSpeedDateSessionForGuild(guildId, guildName, creatorId, protectLobbyRole, memberRewardRole, keepInLobbyRole);
}

async function getLobbyInvite(guildId) {
	let activeSpeedDateBotDoc;
	try {
		activeSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e){
		console.log("SPEED DATE ROUND - START - FAILED - active speed date session not found", {guildId}, e);
	}
	const {activeSession: { initialization: { lobby }}, config: { voiceLobby: { invite }} } = activeSpeedDateBotDoc;
	// Creating clients
	const guildClient = await client.guilds.fetch(guildId);
	const lobbyClient = await guildClient.channels.fetch(lobby.channelId);
	// 1. Create invite to join Lobby Channel
	console.log(`Speed Date CREATE LOBBY INVITE`, {guildId});
	return await createLobbyInvite(lobbyClient, invite);
}


async function startSpeedDateRound(guildId, speedDateDurationMinutes, roomCapacity, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds, dateTerminatorInterval){
	let activeSpeedDateBotDoc;
	try {
		activeSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e){
		console.log("SPEED DATE ROUND - START - FAILED - active speed date session not found", {guildId}, e);
	}
	// TODO - throw if there's an active round
	const { guildInfo } = activeSpeedDateBotDoc;
	// 1. Update speed date Round configurations
	try {
		const startTime = moment().toDate();
		await updatedRoundConfig(guildId, startTime, roomCapacity, speedDateDurationMinutes);
	} catch (e) {
		console.log("SPEED DATE ROUND - START - FAILED - failed to update round config", {guildId, matchMakerInterval, matchMakerTaskDelay})
		throw Error(`SPEED DATE ROUND - START - FAILED - failed to update round config ${guildId}, ${e}`)
	}

	console.log(`Speed Date INVITE MEMBERS for guild ${guildInfo}`);
	await startDateMatchMakerTaskWithDelay(guildId, matchMakerInterval, matchMakerTaskDelay, matchMakerDurationInSeconds)
		.catch(e => console.log(e));
	await startSpeedDateRoundTerminatorTask(guildId, dateTerminatorInterval)
		.catch(e => console.log(e));
}

async function isCommunityBotAdmin(interactionMember, guildId, guildName){
	console.log("Checking if guild member is admin", {guildId, guildName, username: interactionMember?.user?.username})
	const adminRole = await getOrCreateCommunityBotAdminRoleAndPersistIfNeeded(guildId, guildName);
	return interactionMember.roles.cache.has(adminRole.id);
}


module.exports = {
	bootstrapSpeedDateInfrastructureForGuild,
	startSpeedDateRound,
	getLobbyInvite,
	isCommunityBotAdmin
}
