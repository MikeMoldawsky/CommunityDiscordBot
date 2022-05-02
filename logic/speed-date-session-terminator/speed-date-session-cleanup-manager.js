const _ = require("lodash");
const { deleteActiveSessionForGuild, getGuildWithActiveSessionOrThrow } = require("../db/guild-db-manager");
const client = require("../discord/client");
const { terminateSpeedDateRound } = require("../speed-date-round-terminator/speed-date-round-terminator-manager");
const { disconnectFromLobby } = require('../discord/discord-music-player')

async function deleteLobbyAndTempRoles(lobby, guildClient) {
		try {
			console.log("Deleting lobby channel", {lobby, guildId: guildClient.id})
			// 0. remove bot from lobby and close connection to music
			await disconnectFromLobby(guildClient.id)
			// 1. Delete Lobby
			const lobbyClient = await client.channels.fetch(lobby.channelId);
			await lobbyClient.delete();
			} catch (e) {
				if (e?.httpStatus === 404) {
					console.log("Couldn't find lobby it was probably manually deleted", {lobby, guildId: guildClient.id})
				} else {
					throw Error(`Couldn't fetch lobby client for guild ${guildClient.id}, ${lobby.channelId}, ${e}`)
				}
		}
		// 2. Delete temporary speed-dating role for Lobby
		console.log("Deleting ALLOWED LOBBY ROLE", {lobby, guildId: guildClient.id})
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
		const { activeSession:{ initialization: { lobby }} , guildInfo } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)
		// 0. CleanUp Active Round in case it was forgotten
		await terminateSpeedDateRound(guildId);
		// 1. Cleanup resources - Lobby Roles etc.
		const guildClient = await client.guilds.fetch(guildId);
		await deleteLobbyAndTempRoles(lobby, guildClient);
		// 3. Save that active session is completed - i.e. delete it
		await deleteActiveSessionForGuild(guildId);
	} catch (e) {
			console.log(`CleanUp speed date session - FAILURE`, {guildId}, e);
			throw Error(`CleanUp speed date session - FAILURE, ${guildId}, ${e}`);
	}
}

async function endSpeedDateSession(guildId) {
	console.log(`End Speed Date Session - START`, {guildId});
	try {
		await cleanUpSpeedDateSessionForGuild(guildId);
	} catch (e) {
		console.log(`End Speed Date Session - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Session - FAILED ${guildId}, ${e}`);
	}
}

module.exports = { endSpeedDateSession }
