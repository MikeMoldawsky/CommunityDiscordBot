const client = require("../../../logic/discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, isActiveSpeedDateRound, deleteActiveRound } = require("../../db/guild-db-manager");
const { getOrCreateRole } = require("../../discord/utils");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");

async function moveSpeedDatersToLobbyAndDeleteChannel(lobby, rooms, guildClient) {
	await Promise.all(
		_.map(rooms, async ({ voiceChannelId }) => {
			const voiceChannel = await client.channels.fetch(voiceChannelId);
			await Promise.all(
				_.map(Array.from(voiceChannel.members.keys()), async userId => {
					const user = await guildClient.members.fetch(userId)
					return user.voice.setChannel(lobby.channelId)
				})
			)
			return voiceChannel.delete();
		})
	)
}


async function setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, datesHistory) {
	console.log(`Completed Speed Date Round - ADDING ROLES`, {guildInfo, participants, datesHistory});
	const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
		name: `speed-dater`,
		reason: "You deserve a Role as you completed the meeting!",
		color: "RED"
	});
	await Promise.all(
		_.map(participants, async (meetings, userId) => {
			const m = await guildClient.members.fetch(userId);
			m.roles.add(speedDateCompletedRole.id);
			datesHistory[userId] = [..._.get(datesHistory, userId, []), ...meetings];
		})
	);
}


async function terminateSpeedDateRound(guildId) {
	console.log(`End Speed Date Round - START`, {guildId});
	const isActiveRound = await isActiveSpeedDateRound(guildId);
	if (!isActiveRound){
		console.log(`End Speed Date Round - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const activeGuildSpeedDateBotDoc = await getGuildWithActiveSessionOrThrow(guildId);
		const { activeSession:{ initialization: { lobby }, dates, participants} , guildInfo, datesHistory } = activeGuildSpeedDateBotDoc;
		// 1. Cleanup resources - Lobby Roles etc.
		console.log(`Starting Cleanup for guild ${guildInfo}`);
		const guildClient = await client.guilds.fetch(guildId);
		// 2. Create Speed Date Completed Role & Save participants history and add participation role
		await setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, datesHistory);
		await moveSpeedDatersToLobbyAndDeleteChannel(lobby, dates, guildClient);
		await GuildSpeedDateBot.findOneAndUpdate({guildId}, { datesHistory });
		await deleteActiveRound(guildId);
		// TODO - remove round
		console.log(`End Speed Date Round - SUCCESS`, {guildId});
	} catch (e) {
		console.log(`End Speed Date Round - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Round - FAILED for guild ${guildId}, ${e}`);
	}
}

module.exports = { terminateSpeedDateRound }
