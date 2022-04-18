const GuildSpeedDateBot = require("./models/GuildSpeedDateBot");
const _ = require("lodash");

const DEFAULT_INVITE_IMAGE_URL = "https://www.thebirdstage.com/wp-content/uploads/2016/02/Speed-Dating.jpg";
const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';

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

async function updatedConfigFieldsForGuild(guildId, imageUrl, inviteTitle, inviteDescription, musicUrl, musicVolume) {
	// TODO - change the ugly implementation
	const updateFields = {}
	const inviteConfigPrefix = 'config.voiceLobby.invite.'
	if(imageUrl){
		updateFields[inviteConfigPrefix + 'image'] = imageUrl;
	}
	if(inviteTitle){
		updateFields[inviteConfigPrefix + 'title'] = inviteTitle;
	}
	if(inviteDescription){
		updateFields[inviteConfigPrefix + 'description'] = inviteDescription;
	}
	const musicConfigPrefix = 'config.voiceLobby.music.'
	if(musicUrl){
		updateFields[musicConfigPrefix + 'url'] = musicUrl;
	}
	if(musicVolume){
		updateFields[musicConfigPrefix + 'volume'] = musicVolume;
	}

	if(_.isEmpty(updateFields)){
		console.log(`Nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, updateFields);
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
			config: {
				voiceLobby:{
					invite: {
						image: DEFAULT_INVITE_IMAGE_URL,
						title: "🎉 Speed Date Invite 🎉",
						description: "Congratulations!\nYou've been invited to the community Speed Date event.\nJoin Us 💖"
					},
					music: {
						url: DEFAULT_LOBBY_MUSIC_URL,
						volume: 3
					}
				}
			},
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
