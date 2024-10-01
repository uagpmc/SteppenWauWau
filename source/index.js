import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  ActivityType,
  Partials,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";

import { ping, upsertOne } from "./controllers/mongodb.js";

import registerSlashCommands from "./library/registerSlashCommands.js";
import log from "./library/log.js";

import express from "express";

const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
  presence: {
    activities: [
      {
        type: ActivityType.Watching,
        name: "my boot logs",
      },
    ],
  },
});

client.on(Events.ClientReady, async () => {
  // check if I can connect to the database
  const dbPing = await ping();

  if (!dbPing)
    return console.error(
      "Failed to ping the database. Make sure the connection string is correct."
    );

  // check if I'm in any guilds that don't match the guild ID in .env
  const guilds = client.guilds.cache.filter(
    (guild) => guild.id !== process.env.DISCORD_GUILD_ID
  );

  // if I am in any guilds, leave them all except the one in .env
  if (guilds.size > 0)
    guilds.forEach((guild) => {
      console.log(`Leaving guild ${guild.name} (${guild.id})`);
      guild.leave();
    });

  // register my slash commands
  await registerSlashCommands(client);

  // update my presence to show I'm ready
  client.user.setPresence({
    activities: [
      {
        type: ActivityType.Listening,
        name: `enemy comms...`,
      },
    ],
  });

  // log that I'm ready
  await log(`${client.user.tag} is ready! 🚀`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  // upsert the member into the database
  await upsertOne(
    "members",
    { discordId: member.id },
    {
      $set: {
        discordId: member.id,
        discordLastKnownTag: member.user.tag,
      },
      $setOnInsert: {
        insertedAt: new Date(),
      },
      $push: {
        joinedAt: new Date(),
      },
    }
  );

  // prepare by getting the recruitment role
  let recruitmentRole = member.guild.roles.cache.find(
    (role) =>
      role.name === "ncg/recruitment" &&
      role.guild.id === process.env.DISCORD_GUILD_ID
  );

  // if we don't have the role, make it
  if (!recruitmentRole)
    recruitmentRole = await member.guild.roles.create({
      name: "ncg/recruitment",
    });

  // do we have a "welcome" category?
  let welcomeCategory = member.guild.channels.cache.find(
    (channel) =>
      channel.name === "welcome" &&
      channel.type === ChannelType.GuildCategory &&
      channel.guild.id === process.env.DISCORD_GUILD_ID
  );

  // if not, make it
  if (!welcomeCategory)
    welcomeCategory = await member.guild.channels.create({
      name: "welcome",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: member.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: recruitmentRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ],
    });

  // now that we have the category, make a private channel between the member and recruitment role
  const memberWelcomeChannel = await member.guild.channels.create({
    name: `${member.displayName}`,
    parent: welcomeCategory,
    permissionOverwrites: [
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: member.guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: recruitmentRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  // post a welcome message in the channel
  let welcome = `# Welcome to Unnamed Arma Group, ${member}!`;
  welcome += `\n`;
  welcome += `I'm a bot designed to help run the unit. If you have any questions, feel free to ask a human in the members list!`;
  welcome += `\n`;
  welcome += `Due to our community being private, we require all new members to go through a short introduction process. This is to ensure that you're a good fit for our community and that we're a good fit for you!`;
  welcome += `\n`;
  welcome += `Please introduce yourself in this channel, and a member of staff will be with you shortly! We recommend you answer the following questions, ordered by importance:`;
  welcome += `\n`;
  welcome += `> 1. What is your name?\n`;
  welcome += `> 2. How old are you?\n`;
  welcome += `> 3. Where are you from?\n`;
  welcome += `> 4. Have you ever played in an Arma unit before?\n`;
  welcome += `> 5. Do you have experience with the [ACE3](<https://ace3.acemod.org/>) and [ACRE2](<https://steamcommunity.com/workshop/filedetails/?id=751965892>) mods?\n`;
  welcome += `> 6. How did you find us?\n`;

  await memberWelcomeChannel.send(welcome);

  // message all members with the recruitment role to let them know a new member has joined
  const recruitmentMembers = member.guild.members.cache.filter((member) =>
    member.roles.cache.has(recruitmentRole.id)
  );

  recruitmentMembers.forEach(async (recruitmentMember) => {
    try {
      await recruitmentMember.send(
        `A new member has joined the server: ${memberWelcomeChannel.url}`
      );
    } catch (error) {
      console.error(
        `Failed to send recruitment notification to ${recruitmentMember}: ${error}`
      );
    }
  });
});

client.on(Events.GuildMemberRemove, async (member) => {
  // try to send a goodbye message to the member, might fail if they have DMs disabled
  try {
    let goodbye = `# It looks like you've left Unnamed Arma Group!`;
    goodbye += `\n\n`;
    goodbye += `Goodbye, ${member}!`;
    goodbye += `\n\n`;
    goodbye += `We're all sorry to see you go! If you ever change your mind, you can always rejoin by clicking [here](https://uagpmc.com/discord).`;

    await member.send(goodbye);
  } catch (error) {
    console.error(`Failed to send goodbye to ${member}: ${error}`);
  }

  // upsert the member into the database
  await upsertOne(
    "members",
    { discordId: member.id },
    {
      $set: {
        discordId: member.id,
        discordLastKnownTag: member.user.tag,
      },
      $push: {
        joinedDiscordGuildAt: new Date(),
      },
    }
  );
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // increment the message count for the author
  await upsertOne(
    "members",
    { discordId: message.author.id },
    {
      $set: {
        discordId: message.author.id,
        discordLastKnownTag: message.author.tag,
      },
      $inc: {
        discordMessageCount: 1,
      },
    }
  );
});

client.on(Events.MessageDelete, async (message) => {
  // decrement the message count for the author
  await upsertOne(
    "members",
    { discordId: message.author.id },
    {
      $set: {
        discordId: message.author.id,
        discordLastKnownTag: message.author.tag,
      },
      $inc: {
        discordMessageCount: -1,
      },
    }
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    try {
      console.log(`Received command: ${interaction.commandName}`);

      const commandFile = await import(
        `./commands/${interaction.commandName}.js`
      );

      commandFile.default.execute({ interaction });
    } catch (error) {
      console.error(error);

      await interaction.reply("Something went wrong! 😔");
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

const api = express();
const port = 3000;

api.use(express.static("source/public"));

api.get("/", (request, response) => {
  response.json({
    message: "Hello, world!",
  });
});

api.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
