const { getOrCreateRole } = require("../../../logic/discord/utils");
const client = require("../../../logic/discord/client");
const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { deleteActiveSessionForGuild, getGuildWithActiveSpeedDateSessionOrThrow } = require("../../db/guild-db-manager");

async function cleanUpVoiceRouterAndTempRoles(routerVoiceChannel, rooms, guildClient) {
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

	setTimeout(async () => {
		// 2. Delete Router & Voice Channel
		const routerVoiceChannelClient = await client.channels.fetch(routerVoiceChannel.channelId);
		await routerVoiceChannelClient.delete();

		// 3. Delete temporary speed-dating role for Router
		await guildClient.roles.delete(routerVoiceChannel.allowedRoleId);
	}, 30 * 1000)
}

async function addCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, memberMeetingsHistory) {
	console.log(`Completed Speed Date Round role for ${guildInfo}`);
	const speedDateCompletedRole = await getOrCreateRole(guildInfo.guildId, {
		name: `speed-dater`,
		reason: "You deserve a Role as you completed the meeting!",
		color: "RED"
	});
	_.forEach(participants, (meetings, userId) => {
		const m = guildClient.members.cache.get(userId);
		m.roles.add(speedDateCompletedRole.id);
		memberMeetingsHistory[userId] = [..._.get(memberMeetingsHistory, userId, []), ...meetings];
	});
}

async function cleanUpSpeedDateSessionForGuild(guildId) {
	let activeGuildSpeedDateBotDoc;
	console.log(`CleanUp speed date session - START`, {guildId});
	try {
		activeGuildSpeedDateBotDoc = await getGuildWithActiveSpeedDateSessionOrThrow(guildId);
	} catch (e) {
		console.log(`CleanUp speed date session - NOOP - no active session found`, {guildId});
		return;
	}
	try {
		const { activeSpeedDateSession:{ routerVoiceChannel, dates, participants} , guildInfo, memberMeetingsHistory } = activeGuildSpeedDateBotDoc;
		console.log(`Starting Cleanup for guild ${guildInfo}`)
		// 1. Cleanup resources - Router Roles etc.
		const guildClient = await client.guilds.fetch(guildId);
		await cleanUpVoiceRouterAndTempRoles(routerVoiceChannel, dates, guildClient);
		// 2. Create Speed Date Completed Role & Save participants history and add participation role
		// TODO - Mike - it should probably live some place else!
		await addCompletedRolesToSpeedDaters(guildClient, guildInfo, participants, memberMeetingsHistory);
		// 3. Save that active session is completed - i.e. delete it
		// TODO - Asaf - do this in single request
		await GuildSpeedDateBot.findOneAndUpdate({guildId}, {memberMeetingsHistory})
		await deleteActiveSessionForGuild(guildId);
	} catch (e) {
			console.log(`CleanUp speed date session - FAILURE`, {guildId}, e);
			throw Error(`CleanUp speed date session - FAILURE, ${guildId}, ${e}`);
	}
}

module.exports = {
	cleanUpSpeedDateSessionForGuild
}
