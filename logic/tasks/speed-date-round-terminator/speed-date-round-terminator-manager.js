const client = require("../../../logic/discord/client");
const _ = require("lodash");
const { getGuildWithActiveSpeedDateSessionOrThrow } = require("../../db/guild-db-manager");

async function moveSpeedDatersToLobbyAndDeleteChannel(routerVoiceChannel, rooms, guildClient) {
	await Promise.all(
		_.map(rooms, async ({ voiceChannelId }) => {
			const voiceChannel = await client.channels.fetch(voiceChannelId);
			await Promise.all(
				_.map(Array.from(voiceChannel.members.keys()), async userId => {
					const user = await guildClient.members.fetch(userId)
					return user.voice.setChannel(routerVoiceChannel.channelId)
				})
			)
			return voiceChannel.delete();
		})
	)
}


async function endSpeedDateActiveRound(guildId) {
	console.log(`End Speed Date Round - START`, {guildId});
	let activeGuildSpeedDateBotDoc;
	try {
		activeGuildSpeedDateBotDoc = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e) {
		console.log(`End Speed Date Round - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const { activeSpeedDateSession:{ routerVoiceChannel, dates, participants} , guildInfo, memberMeetingsHistory } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)
		// 1. Cleanup resources - Router Roles etc.
		const guildClient = await client.guilds.fetch(guildId);
		await moveSpeedDatersToLobbyAndDeleteChannel(routerVoiceChannel, dates, guildClient);
	} catch (e) {
		console.log(`End Speed Date Round - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Round - FAILED ${guildId}, ${e}`);
	}
}

module.exports = {
	endSpeedDateActiveRound
}
