/**
 * @file Main File of the bot, responsible for registering events, commands, interactions etc.
 * @author Naman Vrati
 * @version 3.0.0
 */

// Declare constants which will be used throughout the bot.

const fs = require("fs");
const { Client, Collection, Intents } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { token, client_id, test_guild_id } = require("./config.json");
const client = require('./logic/client')
/**
 * From v13, specifying the intents is compulsory.
 * @type {Object}
 * @description Main Application Client */

/**********************************************************************/
// Below we will be making an event handler!
const eventFiles = fs
	.readdirSync("./events")
	.filter((file) => file.endsWith(".js"));

// Loop through all files and execute the event when it is actually emmited.
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(
			event.name,
			async (...args) => await event.execute(...args, client)
		);
	}
}

/**********************************************************************/
// Define Collection of Commands, Slash Commands and cooldowns

client.buttonCommands = new Collection();
client.selectCommands = new Collection();
client.contextCommands = new Collection();
client.cooldowns = new Collection();
client.triggers = new Collection();

/**********************************************************************/
// Registration of Message-Based Commands
// Loop through all files and store commands in commands collection.

function configureClientAction(client, clientActionType, baseFolderPath, commandKeyMapper) {
	client[clientActionType] = new Collection();
	const baseFolders = fs.readdirSync(`./${baseFolderPath}`);
	for (const folder of baseFolders) {
		const commandFiles = fs
			.readdirSync(`./${baseFolderPath}/${folder}`)
			.filter((file) => file.endsWith(".js"));
		for (const file of commandFiles) {
			const command = require(`./${baseFolderPath}/${folder}/${file}`);
			client[clientActionType].set(commandKeyMapper(command), command);
		}
	}
}


configureClientAction(client, "commands", "commands", command => command.name);
// Loop through all files and store slash-commands in slashCommands collection.
configureClientAction(client, "slashCommands","interactions/slash", command => command.data.name);





// Registration of Context-Menu Interactions
// Loop through all files and store slash-commands in slashCommands collection.
const contextMenus = fs.readdirSync("./interactions/context-menus");

for (const folder of contextMenus) {
	const files = fs
		.readdirSync(`./interactions/context-menus/${folder}`)
		.filter((file) => file.endsWith(".js"));
	for (const file of files) {
		const menu = require(`./interactions/context-menus/${folder}/${file}`);
		const keyName = `${folder.toUpperCase()} ${menu.data.name}`;
		console.log(`NAME: >>>>>>>> ${keyName}`)
		client.contextCommands.set(keyName, menu);
	}
}

// Registration of Button-Command Interactions.
// Loop through all files and store button-commands in buttonCommands collection.
const buttonCommands = fs.readdirSync("./interactions/buttons");
for (const module of buttonCommands) {
	const commandFiles = fs
		.readdirSync(`./interactions/buttons/${module}`)
		.filter((file) => file.endsWith(".js"));

	for (const commandFile of commandFiles) {
		const command = require(`./interactions/buttons/${module}/${commandFile}`);
		console.log(`set command: ${command.id} with command: ${command}`)
		client.buttonCommands.set(command.id, command);
	}
}

// Registration of select-menus Interactions
// Loop through all files and store select-menus in slashCommands collection.
const selectMenus = fs.readdirSync("./interactions/select-menus");
for (const module of selectMenus) {
 const commandFiles = fs
	 .readdirSync(`./interactions/select-menus/${module}`)
	 .filter((file) => file.endsWith(".js"));
 for (const commandFile of commandFiles) {
	 const command = require(`./interactions/select-menus/${module}/${commandFile}`);
	 client.selectCommands.set(command.id, command);
 }
}

/**********************************************************************/
// Registration of Slash-Commands in Discord API

const rest = new REST({ version: "9" }).setToken(token);

const commandJsonData = [
	...Array.from(client.slashCommands.values()).map((c) => c.data.toJSON()),
	...Array.from(client.contextCommands.values()).map((c) => c.data),
];

(async () => {
	try {
		console.log("Started refreshing application (/) commands.");

		await rest.put(
			/**
			 * Here we are sending to discord our slash commands to be registered.
					There are 2 types of commands, guild commands and global commands.
					Guild commands are for specific guilds and global ones are for all.
					In development, you should use guild commands as guild commands update
					instantly, whereas global commands take upto 1 hour to be published. To
					deploy commands globally, replace the line below with:
				Routes.applicationCommands(client_id)
			 */

			Routes.applicationGuildCommands(client_id, test_guild_id),
			{ body: commandJsonData }
		);

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error(error);
	}
})();

/**********************************************************************/
// Registration of Message Based Chat Triggers
// Loop through all files and store commands in commands collection.

const triggerFolders = fs.readdirSync("./triggers");
for (const folder of triggerFolders) {
	const triggerFiles = fs
		.readdirSync(`./triggers/${folder}`)
		.filter((file) => file.endsWith(".js"));
	for (const file of triggerFiles) {
		const trigger = require(`./triggers/${folder}/${file}`);
		client.triggers.set(trigger.name, trigger);
	}
}

// Login into your client application with bot's token.
client.login(token);

/* TEST MATCH ROOMS
const matchRooms = require('./logic/match-rooms')
const _ = require('lodash')

let history = {}

const ROUNDS = 20
const USERS = 50
const ROUND_USERS = 40

const users = _.map(Array(USERS), (v, i) => `User ${i}`)

for (let i = 0; i < ROUNDS; i++) {
	let roundUsers = _.take(_.shuffle(users), ROUND_USERS)
	let {rooms, history: h} = matchRooms(roundUsers, history, 2)
	console.log({rooms, h})
}

const repetitions = _.countBy(history, userMatches => userMatches.length - _.uniq(userMatches).length)

console.log({repetitions})
 */
