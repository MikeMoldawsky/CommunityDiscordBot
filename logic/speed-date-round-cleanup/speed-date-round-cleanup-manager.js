const client = require("../discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, isActiveSpeedDateRound, findGuildAndUpdate } = require("../db/guild-db-manager");
const { moveSpeedDatersToLobbyAndDeleteChannel } = require('../discord/discord-speed-date-manager')

async function cleanupSpeedDateRound(guildId) {
	console.log(`Cleanup Speed Date Round - START`, {guildId});
	const isActiveRound = await isActiveSpeedDateRound(guildId);
	if (!isActiveRound){
		console.log(`End Speed Date Round - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const activeGuildSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
		const { activeSession:{ initialization: { lobby }, round: { dates } } , guildInfo } = activeGuildSpeedDateBotDoc;
		// 1. Cleanup rooms with one member and empty rooms
		console.log(`Starting Cleanup for guild ${guildInfo}`);
		const guildClient = await client.guilds.fetch(guildId);
		const deletedVoiceChannelIds = await moveSpeedDatersToLobbyAndDeleteChannel(lobby, dates, guildClient, (room, members) => members.size <= 1);
		// 2. Remove deleted rooms from DB
		await findGuildAndUpdate(guildId, {
			'activeSession.round.dates': _.filter(dates, d => !_.includes(deletedVoiceChannelIds, d.voiceChannelId)),
		});
		console.log(`Cleanup Speed Date Round - SUCCESS`, {guildId});
	} catch (e) {
		console.log(`Cleanup Speed Date Round - FAILED`, {guildId}, e);
		throw Error(`Cleanup Speed Date Round - FAILED for guild ${guildId}, ${e}`);
	}
}

module.exports = { cleanupSpeedDateRound }
