const mongoose = require('mongoose')
const db = require('../db')

// invite defaults
const DEFAULT_INVITE_IMAGE_URL = "https://audaciouschurch.com/wp-content/uploads/2020/09/Get-to-know-us.png";
const DEFAULT_INVITE_TITLE = "🫂 Glue With Us 🫂";
const DEFAULT_INVITE_DESCRIPTION = "Congratulations!\nYou've been invited to the\n Community Glue Event.\nCome and join us.";
// music defaults
const DEFAULT_LOBBY_MUSIC_URL = 'https://soundcloud.com/julian_avila/elevatormusic';
const DEFAULT_LOBBY_MUSIC_VOLUME = 10;
// match-maker defaults
const DEFAULT_MATCH_MAKER_DURATION_SECONDS = 30; // match in the first 30 seconds


const ParticipantSchema = new mongoose.Schema({
	id: {type: String, required: true},
	name: {type: String, required: true},
}, { _id : false })

const DateSchema = new mongoose.Schema({
	number: {type: Number, required: true},
	participants: {type: [ParticipantSchema], required: true, default: []},
	voiceChannelId: {type: String, required: true},
}, { _id : false })


const RoundMatchMakerSchema = new mongoose.Schema({
	durationInSeconds: {type: Number, required: true, default: DEFAULT_MATCH_MAKER_DURATION_SECONDS},
}, { _id : false });

const RoundConfigSchema = new mongoose.Schema({
	startTime: {type: Date, required: true},
	durationInMinutes: {type: Number, required: true},
	roomCapacity: {type: Number, required: true}
}, { _id : false });

const RoundSchema = new mongoose.Schema({
	config:  {type:  RoundConfigSchema, required: true},
	matchMaker: {type:  RoundMatchMakerSchema, required: true},
	dates: {type: [DateSchema], default: []},
}, { _id : false });

const LobbySchema = new mongoose.Schema({
	allowedRoleId: {type: String, required: true},
	allowedRoleName: {type: String, required: true},
	channelId: {type: String, required: true},
	channelName: {type: String, required: true}
}, { _id : false })

const InitializationConfigSchema = new mongoose.Schema({
	lobby: {type: LobbySchema, required:true},
}, { _id : false })

const ActiveSessionOnCompleteSchema = new mongoose.Schema({
	rewardRoleId: {type: String, required: true},
	rewardRoleName: {type: String, required: true}
});

const ActiveSessionConfigSchema = new mongoose.Schema({
	onComplete: {type: ActiveSessionOnCompleteSchema},
});

const ActiveSessionSchema = new mongoose.Schema({
	config: {type: ActiveSessionConfigSchema, required: true, default: {}},
	initialization: {type: InitializationConfigSchema, required: true},
	round: {type: RoundSchema},
}, { _id : false })

const SpeedDateInviteConfig = new mongoose.Schema({
	title: {type: String, required: true, default: DEFAULT_INVITE_TITLE},
	description: {type: String, required: true, default: DEFAULT_INVITE_DESCRIPTION},
	image : {type: String, required: true, default: DEFAULT_INVITE_IMAGE_URL},
}, { _id : false })

const SpeedDateMusicConfig = new mongoose.Schema({
	url: {type: String, required: true, default: DEFAULT_LOBBY_MUSIC_URL},
	volume: {type: Number, required: true,  min: 1, max: 100, default: DEFAULT_LOBBY_MUSIC_VOLUME},
}, { _id : false })

const SpeedDateVoiceLobbyConfig = new mongoose.Schema({
	invite: {type: SpeedDateInviteConfig, required: true, default: () => ({})},
	music: {type: SpeedDateMusicConfig, required: true, default: () => ({})},
}, { _id : false })

const CommunityBotAdminConfigSchema = new mongoose.Schema({
	roleId: {type: String, required: true },
	roleName: {type: String, required: true},
}, { _id : false })


const ConfigSchema = new mongoose.Schema({
	voiceLobby: {type: SpeedDateVoiceLobbyConfig, required: true, default: () => ({})},
	ignoreUsers: {type: [String], required: true, default: []},
	admin: {type: CommunityBotAdminConfigSchema, required: true},
}, { _id : false })

const GuildInfoSchema = new mongoose.Schema({
	guildId: {type: String, required: true},
	guildName: {type: String, required: true},
}, { _id : false })

const GuildBotSchema = new mongoose.Schema({
	_id: {type: String, required: true},
	guildInfo: {type: GuildInfoSchema, required: true},
	config: {type: ConfigSchema, required: true, default: () => ({})},
	activeSession: {type: ActiveSessionSchema},
	datesHistory: {type: Object, required: true, default: {}},
})

const GuildBotModel = db.model('Guild', GuildBotSchema)

module.exports = GuildBotModel