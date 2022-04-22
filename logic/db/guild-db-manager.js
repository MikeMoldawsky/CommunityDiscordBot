const GuildSpeedDateBot = require("./models/GuildSpeedDateBot");
const _ = require("lodash");

const DEFAULT_INVITE_IMAGE_URL = "https://www.thebirdstage.com/wp-content/uploads/2016/02/Speed-Dating.jpg";
const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';

function isNilOrEmpty(obj){
	return _.isNil(obj) || _.isEmpty(obj);
}

async function getGuildSpeedDateBotDocumentOrThrow(guildId, guildName = "no-param") {
	const guildBot = await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
	if (isNilOrEmpty(guildBot)) {
		console.log(`GuildInfo for guild ${guildName} with id ${guildId}`);
		throw Error(`Guild ${guildName} with id ${guildId} should have existing bot configurations`);
	}
	return guildBot;
}

async function throwIfActiveSession(guildId) {
	const guildBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
	if (!isNilOrEmpty(guildBotDoc.activeSession)) {
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

async function updatedMatchMakerFieldsForGuild(guildId, durationInSeconds) {
	// TODO - change the ugly implementation
	const updateFields = {}
	if(durationInSeconds){
		updateFields['activeSession.round.matchMaker.durationInSeconds'] = durationInSeconds;
	}

	if(_.isEmpty(updateFields)){
		console.log(`Not updating Match Maker in DB - nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, updateFields);
}

async function updatedRoundConfig(guildId, startTime, roomCapacity, durationInMinutes) {
	// TODO - change the ugly implementation
	const updateFields = {}
	if(startTime){
		updateFields['activeSession.round.config.startTime'] = startTime;
	}
	if(durationInMinutes){
		updateFields['activeSession.round.config.durationInMinutes'] = durationInMinutes;
	}
	if(roomCapacity){
		updateFields['activeSession.round.config.roomCapacity'] = roomCapacity;
	}

	if(_.isEmpty(updateFields)){
		console.log(`Not updating Round Config in DB - nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing Round configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, updateFields);
}

async function updatedLobby(guildId, lobby) {
	// TODO - change the ugly implementation
	const updateFields = {}
	if(lobby){
		updateFields['activeSession.initialization.lobby'] = lobby;
	}

	if(_.isEmpty(updateFields)){
		console.log(`Not updating Round Config in DB - nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing Round configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, updateFields);
}

async function deleteActiveSessionForGuild(guildId) {
	console.log(`Deleting ACTIVE SESSION from DB for guild ${guildId}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, {
		'activeSession': {},
	});
}

async function deleteActiveRound(guildId) {
	console.log(`Deleting ACTIVE ROUND from DB for guild ${guildId}`)
	await GuildSpeedDateBot.findOneAndUpdate({ guildId }, {
		'activeSession.round': {},
	});
}

async function getGuildWithActiveSessionOrThrow(guildId) {
	const guildBotDoc = await getGuildSpeedDateBotDocumentOrThrow(guildId);
	if (isNilOrEmpty(guildBotDoc.activeSession)) {
		console.log(`No active session for guild ${guildBotDoc.guildInfo}`);
		throw Error(`No active session for guild ${guildBotDoc.guildInfo}`);
	}
	return guildBotDoc;
}

async function getSpeedDateBot(guildId){
	return await GuildSpeedDateBot.findOne({ guildId: guildId }).exec();
}

async function isActiveSpeedDateRound(guildId) {
	const guildBot = await getSpeedDateBot(guildId);
	const round = _.get( guildBot,'activeSession.round' );
	return !_.isNil(round) && !_.isEmpty(round);
}


async function isActiveSpeedDateSession(guildId) {
	let guildBot = await getSpeedDateBot(guildId)
	const round = _.get( guildBot,'activeSession' );
	return !_.isNil(round) && !_.isEmpty(round);
}

async function persistAndGetGuildSpeedDateBot(guildInfoDocument, updateReason) {
	try{
		console.log(`Updating DataBase - START`,  { guildInfo: guildInfoDocument.guildInfo, updateReason})
		return await guildInfoDocument.save();
	} catch (e) {
		console.log(`Updating DataBase - FAILED`,  { guildInfo: guildInfoDocument.guildInfo, updateReason}, e)
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
						volume: 1
					}
				}
			},
			activeSpeedDate: {},
			// speedDatesHistory: [],
			// participantsHistory: {},
		});
	} catch (e) {
		console.log(`Failed to get or create guildInfo for guild ${guildName} with id ${guildId}`, e);
	}
}

module.exports = {
	persistAndGetGuildSpeedDateBot,
	getGuildWithActiveSessionOrThrow,
	getGuildSpeedDateBotDocumentOrThrow,
	getOrCreateGuildSpeedDateBotDocument,
	throwIfActiveSession,
	updatedConfigFieldsForGuild,
	deleteActiveSessionForGuild,
	deleteActiveRound,
	updatedMatchMakerFieldsForGuild,
	updatedRoundConfig,
	updatedLobby,
	isActiveSpeedDateRound,
	isActiveSpeedDateSession,
};
