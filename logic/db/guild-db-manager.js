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

async function throwIfActiveSession(guildId) {
	const guildBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
	if (guildBotDoc.activeSpeedDateSession) {
		console.log(`There is an active session for guild ${guildBotDoc.guildInfo}`);
		throw Error(`There is an active session for guild ${guildBotDoc.guildInfo}`);
	}
}

async function updatedConfigFieldsForGuild(guildId, imageUrl) {
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, {
		'config.imageUrl': imageUrl,
	});
}

async function deleteActiveSessionForGuild(guildId) {
	console.log(`Deleting active session from DB for guild ${guildId}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, {
		'activeSpeedDateSession': null,
	});
}

async function getGuildWithActiveSpeedDateSessionOrThrow(guildId) {
	const guildBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
	if (!guildBotDoc.activeSpeedDateSession) {
		console.log(`No active session for guild ${guildBotDoc.guildInfo}`);
		throw Error(`No active session for guild ${guildBotDoc.guildInfo}`);
	}
	return guildBotDoc;
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
	getGuildWithActiveSpeedDateSessionOrThrow,
	getGuildSpeedDateBotDocumentOrThrow,
	getOrCreateGuildSpeedDateBotDocument,
	throwIfActiveSession,
	updatedConfigFieldsForGuild,
	deleteActiveSessionForGuild
};
