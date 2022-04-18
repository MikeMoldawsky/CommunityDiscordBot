const {
	getGuildSpeedDateBotDocumentOrThrow,
} = require("../../../logic/db/guild-db-manager");
const { getOrCreateRole } = require("../../../logic/discord/utils");
const client = require("../../../logic/discord/client");
const _ = require("lodash");
const GuildSpeedDateBot = require("../../../logic/db/models/GuildSpeedDateBot");
const { deleteActiveSessionForGuild } = require("../../db/guild-db-manager");


async function cleanUpVoiceRouterAndTempRoles(routerVoiceChannel, rooms, guildClient) {
	// 2. Delete Router & Voice Channel
	const routerVoiceChannelClient = await client.channels.fetch(routerVoiceChannel.channelId);
	await routerVoiceChannelClient.delete();
	_.forEach(rooms, async ({ voiceChannelId }) => {
		const voiceChannel = await client.channels.fetch(voiceChannelId);
		voiceChannel.delete();
	});

	// 3. Delete temporary speed-dating role for Router
	await guildClient.roles.delete(routerVoiceChannel.allowedRoleId);
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

async function cleanUpSpeedDateForGuild(guildId) {
	try {
			const guildSpeedDateBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
			const { activeSpeedDateSession:{routerVoiceChannel, dates, participants} , guildInfo, memberMeetingsHistory } = guildSpeedDateBotDoc;
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
			console.log({guildSpeedDateBotDoc: guildSpeedDateBotDoc.memberMeetingsHistory})
			await deleteActiveSessionForGuild(guildId);
		} catch (e) {
			console.log(`Failed to perform onComplete operations for ${guildId}`, e)
		}

}

module.exports = {
	cleanUpSpeedDateForGuild
}
