/*
Copyright (C) 2023 github@soulwax

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import fs from 'fs'
import { Command, ClientWithCommands } from './types'
import { Client, Collection } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v10'
import path from 'path'
import config from './config'
const TOKEN = config.token
const VERBOSE = config.verbose

//#region Intents
const IntentBits = {
  GUILDS: 1 << 0,
  GUILD_MEMBERS: 1 << 1,
  GUILD_BANS: 1 << 2,
  GUILD_EMOJIS_AND_STICKERS: 1 << 3,
  GUILD_INTEGRATIONS: 1 << 4,
  GUILD_WEBHOOKS: 1 << 5,
  GUILD_INVITES: 1 << 6,
  GUILD_VOICE_STATES: 1 << 7,
  GUILD_PRESENCES: 1 << 8,
  GUILD_MESSAGES: 1 << 9,
  GUILD_MESSAGE_REACTIONS: 1 << 10,
  GUILD_MESSAGE_TYPING: 1 << 11,
  DIRECT_MESSAGES: 1 << 12,
  DIRECT_MESSAGE_REACTIONS: 1 << 13,
  DIRECT_MESSAGE_TYPING: 1 << 14,
  MESSAGE_CONTENT: 1 << 15,
  GUILD_SCHEDULED_EVENTS: 1 << 16,
  AUTO_MODERATION_CONFIGURATION: 1 << 20,
  AUTO_MODERATION_EXECUTION: 1 << 21,
}

const intents = Object.values(IntentBits).reduce((a, b) => a | b, 0)
//#endregion

//#region REST + CLIENT API + INTENTS + COMMANDS
const rest = new REST({ version: '10' }).setToken(TOKEN ?? '')

const client = new Client({
  intents: intents,
}) as ClientWithCommands
client.setMaxListeners(15)
client.commands = new Collection()

const commandFiles = fs.readdirSync(path.join(__dirname, './commands')).filter((file) => file.endsWith('.ts'))

for (const file of commandFiles) {
  if (VERBOSE) console.log(`Loading command ${file}... :`)
  import(path.join(__dirname, `./commands/${file}`)).then((commandModule) => {
    
    const command = {
      name: commandModule.name,
      description: commandModule.description,
      execute: commandModule.execute,
    }
    if (VERBOSE) console.dir(command)
    client.commands.set(command.name, command)
    if (VERBOSE) console.log(`Loaded command ${command.name}.`)
  })
}

const commands = [
  new SlashCommandBuilder()
    .setName('diffuse')
    .setDescription('This command will generate an image from a prompt and reply with the result.')
    .addStringOption((option) =>
      option.setName('prompt').setDescription('The text prompt for image generation.').setRequired(true),
    ),
  new SlashCommandBuilder().setName('help').setDescription('Lists all available commands.'),
]

;(async () => {
  try {
    console.log(`Started refreshing application (/) commands.`)

    await rest.put(Routes.applicationCommands(config.clientId ?? ''), {
      body: commands,
    })

    console.log(`Successfully reloaded application (/) commands.`)
  } catch (error) {
    console.error(error)
  }
})()

//#endregion

//#region command handling
// Add this block to handle the interactionCreate event
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return

  const { commandName } = interaction

  if (commandName === 'diffuse') {
    const cmd = client.commands.get('diffuse') as Command
    if (cmd) {
      cmd.execute(interaction)
    }
  } else if (commandName === 'help') {
    const cmd = client.commands.get('help') as Command
    if (cmd) {
      cmd.execute(interaction)
    }
  }
})

//#endregion

export default {
  client: client,
  rest: rest,
  commands: commands,
}
