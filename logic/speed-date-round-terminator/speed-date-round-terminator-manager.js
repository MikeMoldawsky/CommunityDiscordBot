const client = require("../discord/client");
const _ = require("lodash");
const { getGuildWithActiveSessionOrThrow, isActiveSpeedDateRound, deleteActiveRound, findGuildAndUpdate } = require("../db/guild-db-manager");
const { getOrCreateRole } = require("../discord/utils");
const { moveSpeedDatersToLobbyAndDeleteChannel } = require('../discord/discord-speed-date-manager')

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
		console.log(`End Speed Date Round - SUCCESS`, {guildId});
	} catch (e) {
		console.log(`End Speed Date Round - FAILED`, {guildId}, e);
		throw Error(`End Speed Date Round - FAILED for guild ${guildId}, ${e}`);
	}
}

module.exports = { terminateSpeedDateRound }
