const {  Permissions } = require("discord.js");

const MODERATOR_PERMISSIONS = [
	Permissions.FLAGS.VIEW_CHANNEL,
	Permissions.FLAGS.CONNECT,
	Permissions.FLAGS.SPEAK,
	Permissions.FLAGS.MUTE_MEMBERS,
	Permissions.FLAGS.MOVE_MEMBERS,
	Permissions.FLAGS.USE_VAD,
]

const PERMISSIONS = {
	// LOBBY
	LOBBY_DENY: [
		Permissions.FLAGS.VIEW_CHANNEL,
		Permissions.FLAGS.CONNECT,
		Permissions.FLAGS.SPEAK,
	],
	LOBBY_CONNECTO: MODERATOR_PERMISSIONS,
	LOBBY_MODERATOR: MODERATOR_PERMISSIONS,
	LOBBY_PARTICIPANT: {
		[Permissions.FLAGS.VIEW_CHANNEL]: true,
		[Permissions.FLAGS.CONNECT]: true,
		[Permissions.FLAGS.USE_VAD]: true,
	},
	// ROOMS
	ROOM_DENY: [Permissions.FLAGS.CONNECT],
	ROOM_CONNECTO: [
		Permissions.FLAGS.VIEW_CHANNEL,
		Permissions.FLAGS.CONNECT,
		Permissions.FLAGS.MOVE_MEMBERS,
	],
	ROOM_MODERATOR: MODERATOR_PERMISSIONS,
	ROOM_PARTICIPANT: [
		Permissions.FLAGS.VIEW_CHANNEL,
		Permissions.FLAGS.CONNECT,
		Permissions.FLAGS.SPEAK,
		Permissions.FLAGS.USE_VAD,
	],
}

module.exports = {
	PERMISSIONS,
	DEFAULT_LOBBY_NAME: "Connecto Lobby",
	DEFAULT_ADMIN_ROLE_NAME: "connecto-admin",
	DEFAULT_MODERATOR_ROLE_NAME: "connecto-moderator",
}