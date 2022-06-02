const GuildCommunityBotModel = require("./models/GuildBotModel");
const _ = require("lodash");

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

async function updatedActiveSessionOnCompleteConfig(guildId, rewardPlayersRole) {
	// TODO - change the ugly implementation
	const updateFields = {}
	if(rewardPlayersRole){
		updateFields['activeSession.config.onComplete.rewardRoleId'] = rewardPlayersRole.id;
		updateFields['activeSession.config.onComplete.rewardRoleName'] = rewardPlayersRole.name;
	}

	if(_.isEmpty(updateFields)){
		console.log(`Not updating activeSession.config in DB - nothing to update for guild ${guildId}`);
		return;
	}
	console.log(`Performing Active session config update with params: ${JSON.stringify(updateFields)}`)
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

async function getOrCreateGuildSpeedDateBotDocument(guildId, guildName, communityBotAdminRole) {
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
				admin:{
					roleId: communityBotAdminRole.id,
					roleName: communityBotAdminRole.name,
				}
			}
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
	updatedConfigFieldsForGuild,
	deleteActiveSessionForGuild,
	deleteActiveRound,
	updatedMatchMakerFieldsForGuild,
	updatedRoundConfig,
	updatedLobby,
	isActiveSpeedDateRound,
	isActiveSpeedDateSession,
	findGuildAndUpdate,
	updatedActiveSessionOnCompleteConfig
};
