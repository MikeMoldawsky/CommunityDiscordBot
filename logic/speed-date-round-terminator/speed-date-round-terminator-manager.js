const client = require("../discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, isActiveSpeedDateRound, deleteActiveRound, findGuildAndUpdate } = require("../db/guild-db-manager");
const { getOrCreateRole } = require("../discord/utils");

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
	try {
		await Promise.all(
			_.map(rooms, async (room) => {
				try {
					const dateVoiceChannel = await client.channels.fetch(room.voiceChannelId);
					const members = dateVoiceChannel.members.keys();
					try {
						console.log("Moving speed-daters back to lobby", {room: JSON.stringify(room), members})
						await moveMembersToLobby(members, guildClient, lobby);
					} catch (e) {
						console.log("Failed to move speed-daters back to lobby", {members, lobby}, e)
					}
					console.log("Deleting speed-daters voice channel room", {room: JSON.stringify(room)})
					return dateVoiceChannel.delete();
				} catch (e) {
					console.log("Cleanup Round - failed to move ROOM to lobby and delete - FAILED FATAL", {room, lobby, e})
				}
			})
		)
	} catch (e) {
		console.log("Cleanup Round - failed to move all ROOMS! - FAILED FATAL", {rooms, lobby, e})
	}
}

async function setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, dates, datesHistory, onComplete = undefined) {
	console.log(`Completed Speed Date Round - ADDING ROLES`, {guildInfo, dates, datesHistory, onComplete});
	let rewardRoleId;
	if(!onComplete){
		const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, `connecto-veteran`, "You deserve a Role as you completed a Connecto round!", "RED");
		rewardRoleId = speedDateCompletedRole.id;
	} else {
		rewardRoleId = onComplete.rewardRoleId;
	}

	await Promise.all(
		_.flatMap(dates, ({participants: dateParticipants}) => {
			return _.map(dateParticipants, async ({ id: memberId }) => {
				const member = await guildClient.members.fetch(memberId);
				member.roles.add(rewardRoleId);
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
		const { activeSession:{ initialization: { lobby }, round: { dates }, config: {onComplete}} , guildInfo, datesHistory } = activeGuildSpeedDateBotDoc;
		// 1. Cleanup resources - Lobby Roles etc.
		console.log(`Starting Cleanup for guild ${guildInfo}`);
		const guildClient = await client.guilds.fetch(guildId);
		// 2. Create Speed Date Completed Role & Save participants history and add participation role
		await setMeetingHistoryAndGrantCompletedRolesToSpeedDaters(guildClient, guildInfo, dates, datesHistory, onComplete);
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
