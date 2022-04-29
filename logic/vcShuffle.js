const { Permissions } = require('discord.js');
const _ = require("lodash");


async function createVoiceChannel(guild, roomNumber, memberIds) {
	const permissionOverwrites = [
		{
			id: guild.id, deny: [Permissions.FLAGS.CONNECT] },
		..._.map(memberIds, id => ({ id: id, allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK] })
		)
	];
	return guild.channels.create(`Room#${roomNumber}`, {
		type: "GUILD_VOICE",
		reason: "Let's connect and get to know each other :)",
		permissionOverwrites: permissionOverwrites
	})
}


module.exports = {
	createVoiceChannel
};