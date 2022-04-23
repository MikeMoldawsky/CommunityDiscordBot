const { getOrCreateGuildSpeedDateBotDocument, throwIfActiveSession, updatedConfigFieldsForGuild, isBotAdmin,
	addAdminUser
} = require("../db/guild-db-manager");

async function updateMusicIfNeeded(guildId, guildName, musicUrl, musicVolume){
	try {
		// TODO - make check more elegant
		if(!musicUrl && !musicVolume){
			console.log(`Not updating MUSIC configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			return;
		}
		// 1. Don't allow configure while active speed dating
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		await throwIfActiveSession(guildId)
		await updatedConfigFieldsForGuild(guildId, undefined, undefined, undefined, musicUrl, musicVolume, undefined, undefined);
	} catch (e) {
		console.log(`Can't update MUSIC configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Can't update MUSIC configuration while active speed date for guild ${guildName} with ${guildId}, ${e}`);
	}
}

async function updateInviteIfNeeded(guildId, guildName, inviteImageUrl, inviteTitle, inviteText){
	try {
		// TODO - make check more elegant
		if(!inviteImageUrl && !inviteTitle && !inviteText){
			console.log(`Not updating INVITE configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			return;
		}
		// 1. Don't allow configure while active speed dating
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		await throwIfActiveSession(guildId)
		await updatedConfigFieldsForGuild(guildId, inviteImageUrl, inviteTitle, inviteText, undefined, undefined, undefined, undefined);
	} catch (e) {
		console.log(`Can't update INVITE configuration while active speed date for guild ${guildName} with ${guildId}`, e);
		throw Error(`Can't update INVITE configuration while active speed date for guild ${guildName} with ${guildId}, ${e}`);
	}
}


async function updateIgnoredUsersIfNeeded(guildId, guildName, ignoreUser, removeIgnoreUser){
	try {
		// TODO - make check more elegant
		if(!ignoreUser && !removeIgnoreUser){
			console.log(`Not updating IGNORED USERS configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			return;
		}
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		// await throwIfActiveSession(guildId) - allow update while session
		await updatedConfigFieldsForGuild(guildId, undefined, undefined, undefined, undefined, undefined, ignoreUser, removeIgnoreUser);
	} catch (e) {
		console.log(`Can't update configuration for guild ${guildName} with ${guildId}`, e);
		throw Error(`Can't update configuration date for guild ${guildName} with ${guildId}, ${e}`);
	}
}

async function addAdminUsersIfNeeded(guildId, guildName, adminUser) {
	try {
		if (!adminUser) {
			console.log(`Not adding ADMIN USERS configurations for guild ${guildName} with ${guildId} - parameters weren't passed...`);
			return;
		}
		await getOrCreateGuildSpeedDateBotDocument(guildId, guildName); // if it's the first time you should be able to configure
		await addAdminUser(guildId, adminUser);
	} catch (e) {
		console.log(`Can't update configuration for guild ${guildName} with ${guildId}`, e);
		throw Error(`Can't update configuration date for guild ${guildName} with ${guildId}, ${e}`);
	}
}


async function isAdminUser(guildId, user) {
	try {
		if (!user) {
			console.log(`Is admin user wasn't passed for guild ${guildId}...`);
			return false;
		}
		return await isBotAdmin(guildId, user.id);
	} catch (e) {
		console.log(`Is admin user failed...`, {guildId, user, e});
		throw Error(`Is admin user failed for guild ${guildId}, ${e}`);
	}
}


module.exports = {
	updateMusicIfNeeded,
	updateInviteIfNeeded,
	updateIgnoredUsersIfNeeded,
	addAdminUsersIfNeeded,
	isAdminUser
}
