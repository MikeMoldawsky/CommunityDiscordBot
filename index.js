/**
 * @file Main File of the bot, responsible for registering events, commands, interactions etc.
 * @author Naman Vrati
 * @version 3.0.0
 */

// Declare constants which will be used throughout the bot.

require("dotenv").config();
const fs = require("fs");
const { Collection} = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const client = require('./logic/discord/client')

/**
 * From v13, specifying the intents is compulsory.
 * @type {Object}
 * @description Main Application Client */

/**********************************************************************/
function configureClientEventsHandler() {
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
}

/**********************************************************************/
// Registration of Message-Based Commands
// Loop through all files and store commands in commands collection.

function configureClientAction(commandsCollection, baseFolderPath, commandKeyMapper) {
	const baseFolders = fs.readdirSync(`./${baseFolderPath}`);
	for (const folder of baseFolders) {
		const commandFiles = fs
			.readdirSync(`./${baseFolderPath}/${folder}`)
			.filter((file) => file.endsWith(".js"));
		for (const file of commandFiles) {
			const command = require(`./${baseFolderPath}/${folder}/${file}`);
			commandsCollection.set(commandKeyMapper(command), command);
		}
	}
}


/**********************************************************************/
// Below we will be making an event handler!
configureClientEventsHandler();

// Loop through all files and store slash-commands in slashCommands collection.
client.slashCommands = new Collection();
configureClientAction(client.slashCommands,"interactions/slash", command => command.data.name);

/**********************************************************************/
// Registration of Slash-Commands in Discord API

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

const commandJsonData = [
	...Array.from(client.slashCommands.values()).map((c) => c.data.toJSON()),
];

(async () => {
	try {
		console.log("Refreshing application Slash Commands...");

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
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			// Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_TEST_GUILD_ID),
			{ body: commandJsonData }
		);
		console.log("Successfully reloaded application Slash Commands to Discord REST API.");
	} catch (error) {
		console.error(error);
	}
})();

/**********************************************************************/
// Login into your client application with bot's token.
client.login(process.env.DISCORD_TOKEN);
