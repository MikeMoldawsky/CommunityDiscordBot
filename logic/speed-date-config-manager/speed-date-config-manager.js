const { getOrCreateGuildSpeedDateBotDocument, throwIfActiveSession, updatedConfigFieldsForGuild } = require("../db/guild-db-manager");

async function updateBotConfigIfNeeded(guildId, guildName, inviteImageUrl, inviteTitle, inviteText, musicUrl, musicVolume ){
	try {
		// TODO - make check more elegant
		if(!inviteImageUrl && !inviteTitle && !inviteText && !musicUrl && !musicVolume){
			console.log(`Not updating configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			return;
		}
		// 1. Don't allow configure while active speed dating
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		await throwIfActiveSession(guildId)
		await updatedConfigFieldsForGuild(guildId, inviteImageUrl, inviteTitle, inviteText, musicUrl, musicVolume);
	} catch (e) {
		console.log(`Can't update configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Can't update configuration while active speed date for guild ${guildName} with ${guildId}, ${e}`);
	}
}

module.exports = {
	 updateBotConfigIfNeeded
}