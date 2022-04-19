const {  cleanUpSpeedDateSessionForGuild } = require("./speed-date-cleanup-manager");

async function endSpeedDateSessionTask(guildId) {
	console.log(`End Speed Date Session - START`, {guildId});
	try {
      await cleanUpSpeedDateSessionForGuild(guildId);
	} catch (e) {
		console.log(`End Speed Date Session - FAILED - no active session for Guild`, {guildId}, e);
		throw Error(`End Speed Date Session - FAILED - no active session for Guild ${guildId}, ${e}`);
	}
}

module.exports = { endSpeedDateSessionTask }
