const GuildSpeedDateBot = require("./models/GuildSpeedDateBot");

const DEFAULT_INVITE_IMAGE_URL = "https://i.imgur.com/ZGPxFN2.jpg";

async function getGuildSpeedDateBotDocumentOrThrow(guildId, guildName = "no-param") {
	const guildInfo = await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
	if (!guildInfo) {
		console.log(`GuildInfo for guild ${guildName} with id ${guildId}`);
		throw Error(`Guild ${guildName} with id ${guildId} should have existing bot configurations`);
	}
	return guildInfo;
}

async function persistAndGetGuildSpeedDateBot(guildInfoDocument, updateReason) {
	try{
		console.log(`Updating GuildInfo in DB for guild ${guildInfoDocument.guildName} with id ${guildInfoDocument.guildId} - ${updateReason}`)
		return await guildInfoDocument.save();
	} catch (e) {
		console.log(`Failed to update DB for guild ${guildInfoDocument.guildName} with id ${guildInfoDocument.guildId}`, e)
	}
}

async function getOrCreateGuildSpeedDateBotDocument(guildId, guildName) {
	try {
		let guildInfo = await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
		if (guildInfo) {
			console.log(`Found speed date bot configurations for guild ${guildName} with id ${guildId}`);
			return guildInfo;
		}
		console.log(`Creating guildInfo for guild ${guildName} with id ${guildId}`);
		return await GuildSpeedDateBot.create({
			guildInfo: {
				guildId: guildId,
				guildName: guildName,
			},
			config: { imageUrl: DEFAULT_INVITE_IMAGE_URL },
			activeSpeedDate: undefined,
			// speedDatesHistory: [],
			// participantsHistory: {},
		});
	} catch (e) {
		console.log(`Failed to get or create guildInfo for guild ${guildName} with id ${guildId}`, e);
	}
}

module.exports = {
	persistAndGetGuildSpeedDateBot,
	getGuildSpeedDateBotDocumentOrThrow,
	getOrCreateGuildSpeedDateBotDocument
};
