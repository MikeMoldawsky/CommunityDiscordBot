const client = require("../discord/client");
const { getGuildSpeedDateBotDocumentOrThrow, getOrCreateGuildSpeedDateBotDocument,
	getGuildWithActiveSpeedDateSessionOrThrow
} = require("../db/guild-db-manager");
const { addRoleToChannelMembers } = require("../discord/utils");
const { createRouterVoiceChannelInvite } = require("../discord/discord-speed-date-manager");
const { initializeSpeedDateSessionForGuild } = require("../speed-date-bootstraper/speed-date-bootstrapper");
const { startDateMatchMakerTaskWithDelayForGuild } = require("../tasks/speed-date-match-maker/speed-date-match-maker-task");


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
	await initializeSpeedDateSessionForGuild(prevGuildSpeedDateBotDoc, guildClient, lobbyChannelClient, speedDateDurationMinutes, roomCapacity, matchMakerStopTime, creatorId);
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

async function startSpeedDateRoundAndGetInvite(guildId, matchMakerInterval, matchMakerTaskDelay){
	let activeSpeedDateBotDoc;
	try {
		activeSpeedDateBotDoc = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e){
		console.log("START SPEED DATE ROUND FAILED - active speed date session not found", {guildId}, e);
	}
	const {activeSpeedDateSession: { routerVoiceChannel: {allowedRoleId, channelId }, speedDateSessionConfig: { lobbyChannelId }},
		config: { voiceLobby: { invite }}, guildInfo } = activeSpeedDateBotDoc;
	console.log(`Speed Date INVITE MEMBERS for guild ${guildInfo}`);
	startDateMatchMakerTaskWithDelayForGuild(guildId, matchMakerInterval, matchMakerTaskDelay)
		.catch(e => console.log(e));
	return await allowMembersJoinLobbyAndGetInvite(guildId, lobbyChannelId, channelId, allowedRoleId, invite);
}


module.exports = {
	bootstrapSpeedDateInfrastructureForGuild,
	startSpeedDateRoundAndGetInvite
}