const client = require("../../../logic/discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, isActiveSpeedDateRound, deleteActiveRound, findGuildAndUpdate } = require("../../db/guild-db-manager");
const { getOrCreateRole } = require("../../discord/utils");

async function moveMembersToLobby(speedDateMembers, guildClient, lobby ) {
	const guildMemberClient = guildClient.members;
	await Promise.all(
		_.map(Array.from(speedDateMembers), async userId => {
			const user = await guildMemberClient.fetch(userId);
			return user.voice.setChannel(lobby.channelId);
		})
	);
}

async function moveSpeedDatersToLobbyAndDeleteChannel(lobby, rooms, guildClient) {
	await Promise.all(
		_.map(rooms, async (room) => {
			const dateVoiceChannel = await client.channels.fetch(room.voiceChannelId);
			const members = dateVoiceChannel.members.keys();
			console.log("Moving speed-daters back to lobby", {room, members})
			try {
				await moveMembersToLobby(members, guildClient, lobby);
			} catch (e) {
				console.log("Failed to move speed-daters back to lobby", {members:members, lobby}, e)
			}
			console.log("Deleting speed-daters voice channel room", {room})
			return dateVoiceChannel.delete();
		})
	)
}

async function setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, dates, datesHistory) {
	console.log(`Completed Speed Date Round - ADDING ROLES`, {guildInfo, dates, datesHistory});
	const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
		name: `speed-dater`,
		reason: "You deserve a Role as you completed the meeting!",
		color: "RED"
	});

	await Promise.all(
		_.flatMap(dates, ({participants: dateParticipants}) => {
			return _.map(dateParticipants, async ({ id: memberId }) => {
				const member = await guildClient.members.fetch(memberId);
				member.roles.add(speedDateCompletedRole.id);
				const memberMeeting = _.without(_.map(dateParticipants, 'id'), memberId)
				datesHistory[memberId] = [..._.get(datesHistory, memberId, []), ...memberMeeting];
			})
		})
	)
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
		const { activeSession:{ initialization: { lobby }, round: { dates }} , guildInfo, datesHistory } = activeGuildSpeedDateBotDoc;
		// 1. Cleanup resources - Lobby Roles etc.
		console.log(`Starting Cleanup for guild ${guildInfo}`);
		const guildClient = await client.guilds.fetch(guildId);
		// 2. Create Speed Date Completed Role & Save participants history and add participation role
		await setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, dates, datesHistory);
		await moveSpeedDatersToLobbyAndDeleteChannel(lobby, dates, guildClient);
		await findGuildAndUpdate(guildId, {datesHistory});
		await deleteActiveRound(guildId);
		// TODO - remove round
		console.log(`End Speed Date Round - SUCCESS`, {guildId});
	} catch (e) {
		console.log(`End Speed Date Round - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Round - FAILED for guild ${guildId}, ${e}`);
	}
}

module.exports = { terminateSpeedDateRound }
