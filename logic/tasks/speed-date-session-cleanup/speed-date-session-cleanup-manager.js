const _ = require("lodash");
const { deleteActiveSessionForGuild, getGuildWithActiveSessionOrThrow } = require("../../db/guild-db-manager");
const client = require("../../discord/client");
const { terminateSpeedDateRound } = require("../speed-date-round-terminator/speed-date-round-terminator-manager");

async function deleteLobbyAndTempRoles(lobby, rooms, guildClient) {
		// 2. Delete Lobby
		const lobbyClient = await client.channels.fetch(lobby.channelId);
		await lobbyClient.delete();
		// 3. Delete temporary speed-dating role for Lobby
		await guildClient.roles.delete(lobby.allowedRoleId);
}

async function cleanUpSpeedDateSessionForGuild(guildId) {
	let activeGuildSpeedDateBotDoc;
	console.log(`CleanUp speed date session - START`, {guildId});
	try {
		activeGuildSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
	} catch (e) {
		console.log(`CleanUp speed date session - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const { activeSession:{ initialization: { lobby }, dates} , guildInfo } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)
		// 0. CleanUp Active Round in case it was forgotten
		await terminateSpeedDateRound(guildId);
		// 1. Cleanup resources - Lobby Roles etc.
		const guildClient = await client.guilds.fetch(guildId);
		await deleteLobbyAndTempRoles(lobby, dates, guildClient);
		// 3. Save that active session is completed - i.e. delete it
		await deleteActiveSessionForGuild(guildId);
	} catch (e) {
			console.log(`CleanUp speed date session - FAILURE`, {guildId}, e);
			throw Error(`CleanUp speed date session - FAILURE, ${guildId}, ${e}`);
	}
}

async function endSpeedDateSessionTask(guildId) {
	console.log(`End Speed Date Session - START`, {guildId});
	try {
		await cleanUpSpeedDateSessionForGuild(guildId);
	} catch (e) {
		console.log(`End Speed Date Session - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Session - FAILED ${guildId}, ${e}`);
	}
}

module.exports = { endSpeedDateSessionTask }
