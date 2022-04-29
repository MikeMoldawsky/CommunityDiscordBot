const GuildCommunityBotModel = require("./models/GuildBotModel");
const _ = require("lodash");

const DEFAULT_INVITE_IMAGE_URL = "https://www.thebirdstage.com/wp-content/uploads/2016/02/Speed-Dating.jpg";
const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';

function isNilOrEmpty(obj){
	return _.isNil(obj) || _.isEmpty(obj);
}

async function getGuildSpeedDateBotDocumentOrThrow(guildId, guildName = "no-param") {
	const guildBot = await GuildCommunityBotModel.findById(guildId).exec();
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

async function updatedConfigFieldsForGuild(guildId, imageUrl, inviteTitle, inviteDescription, musicUrl, musicVolume, ignoreUser, removeIgnoreUser) {
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
	if (ignoreUser || removeIgnoreUser) {
		const { config: {ignoreUsers} } = await getGuildSpeedDateBotDocumentOrThrow(guildId);
		const ignoreUserArray = ignoreUser ? [ignoreUser.id] : [];
		// add user to ignored list
		const newIgnoredUsers = _.union(ignoreUsers, ignoreUserArray);
		// remove user from ignored list
		updateFields['config.ignoreUsers'] = _.filter(newIgnoredUsers, user => user !== removeIgnoreUser?.id);
	}

	if(_.isEmpty(updateFields)){
		console.log(`Nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, updateFields);
}

async function addAdminUser(guildId, addAdminUser){
	const updateFields = {}
	if (addAdminUser) {
		const { config: { botAdmins } } = await getGuildSpeedDateBotDocumentOrThrow(guildId);
		const addAdminUsersArray = addAdminUser?.id ? [addAdminUser.id] : [];
		// add user to admin list
		updateFields['config.botAdmins'] = _.union(botAdmins, addAdminUsersArray);
	}
	if(_.isEmpty(updateFields)){
		console.log(`Nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing configuration update with params: ${JSON.stringify(updateFields)}`)
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, updateFields);
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
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, updateFields);
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
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, updateFields);
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
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, updateFields);
}

async function deleteActiveSessionForGuild(guildId) {
	console.log(`Deleting ACTIVE SESSION from DB for guild ${guildId}`)
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, {
		$unset: {'activeSession': 1},
	});
}

async function deleteActiveRound(guildId) {
	console.log(`Deleting ACTIVE ROUND from DB for guild ${guildId}`)
	await GuildCommunityBotModel.findOneAndUpdate({ _id: guildId }, {
		$unset: {'activeSession.round': 1},
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
	return await GuildCommunityBotModel.findById(guildId).exec();
}

async function isActiveSpeedDateRound(guildId) {
	const guildBot = await getSpeedDateBot(guildId);
	const round = _.get( guildBot,'activeSession.round' );
	return !isNilOrEmpty(round);
}

async function isActiveSpeedDateSession(guildId) {
	let guildBot = await getSpeedDateBot(guildId)
	const activeSession = _.get( guildBot,'activeSession' );
	return !isNilOrEmpty(activeSession);
}

async function isNoBotAdminConfigured(guildId) {
	const guildBot = await getSpeedDateBot(guildId);
	const botAdmins = _.get( guildBot,'config.botAdmins' ) || [];
	return _.isEmpty(botAdmins);
}

async function isBotAdmin(guildId, userId) {
	const guildBot = await getSpeedDateBot(guildId);
	const botAdmins = _.get( guildBot,'config.botAdmins' ) || [];
	return _.isEmpty(botAdmins) ||  _.includes(botAdmins, userId);
}

async function getOrCreateGuildSpeedDateBotDocument(guildId, guildName) {
	try {
		let guildInfo = await GuildCommunityBotModel.findById(guildId).exec();
		if (guildInfo) {
			console.log(`Found speed date bot configurations for guild ${guildName} with id ${guildId}`);
			return guildInfo;
		}
		console.log(`Creating guildInfo for guild ${guildName} with id ${guildId}`);
		const document = {
			_id: guildId,
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
		};
		const guildCommunityBotModel = new GuildCommunityBotModel(document);
		return await guildCommunityBotModel.save();
	} catch (e) {
		console.log(`Failed to get or create guildInfo for guild ${guildName} with id ${guildId}`, e);
	}
}

async function findGuildAndUpdate(guildId,  updatedGuildBotFieldsObject){
	await GuildCommunityBotModel.findOneAndUpdate({_id: guildId}, updatedGuildBotFieldsObject);
}

module.exports = {
	getGuildWithActiveSessionOrThrow,
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
	addAdminUser,
	isBotAdmin,
	isNoBotAdminConfigured,
	findGuildAndUpdate
};
