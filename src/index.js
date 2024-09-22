import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  ActivityType,
} from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  presence: {
    activities: [
      {
        type: ActivityType.Watching,
        name: "my boot logs",
      },
    ],
  },
});

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // check if I'm in any guilds that don't match the guild ID in .env
  const guilds = client.guilds.cache.filter(
    (guild) => guild.id !== process.env.DISCORD_GUILD_ID
  );

  console.log(`Found ${guilds.size} guilds`);

  // if I am, leave them
  if (guilds.size > 0) {
    guilds.forEach((guild) => {
      console.log(`Leaving guild ${guild.name} (${guild.id})`);
      guild.leave();
    });
  }

  // then register my slash commands
  for (const command of Object.values(InteractionCommands)) {
    client.guilds.cache
      .get(process.env.DISCORD_GUILD_ID)
      .commands.create(command.data);
  }

  // now update my presence
  client.user.setPresence({
    activities: [
      {
        type: ActivityType.Listening,
        name: `to enemy comms...`,
      },
    ],
  });
});

client.on(Events.GuildMemberAdd, (member) => {
  sendMemberIntro(member);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName in InteractionCommands) {
    InteractionCommands[commandName].execute({ interaction });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

async function sendMemberIntro(member) {
  let recruitmentTextChannel = uagChannel("recruitment-text");
  let recruitmentUrl = recruitmentTextChannel.url;

  let intro = `# Welcome to Unnamed Arma Group!`;
  intro += `\n\n`;
  intro += `Hello ${member},\n\n`;
  intro += `I'm a bot created to help you get started with our group, and this is everything you need to know to get started!`;
  intro += `\n\n`;
  intro += `## Who we are`;
  intro += `\n\n`;
  intro += `Unnamed Arma Group is a community dedicated to hosting "seriously fun" sessions for Arma 3. We specifically focus on small team tactics where each member is a vital part of the team and not just a grunt. You'll also find that we have a relaxed atmosphere, with no "yes sir, no sir" BS to deal with.`;
  intro += `\n\n`;
  intro += `## How to join`;
  intro += `\n\n`;
  intro +=
    `It's simple! Just head over to our [recruitment-text channel](${recruitmentUrl}) in the Discord use the ` /
    apply` command to get started. You'll be asked a few questions about your experience with Arma and what you're looking for in a group. Once you've filled out the application, a member of our recruitment team will reach out to you to schedule a quick interview. Don't worry, it's nothing too serious! We just want to make sure you'll fit in with our group so you can have the best experience possible.`;
  intro += `\n\n`;
  intro += `## Anything else?`;
  intro += `\n\n`;
  intro += `If you have any questions, feel free to ask in the [recruitment-text channel](${recruitmentUrl}) and someone will be happy to help you out!`;
  intro += `\n\n`;
  intro += `Oh, and if you somehow leave the Discord server, don't worry! You can always rejoin by clicking [here](https://uagpmc.com/discord).`;

  member.send(intro);
}

function uagChannel(name) {
  return client.guilds.cache
    .get(process.env.DISCORD_GUILD_ID)
    .channels.cache.find((channel) => channel.name === name);
}

const InteractionCommands = {
  apply: {
    data: new SlashCommandBuilder()
      .setName("apply")
      .setDescription("Start the application process to join the unit.")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("Your in-game name.")
          .setRequired(true)
      ),
    // .addIntegerOption((option) =>
    //   option.setName("age").setDescription("Your age.").setRequired(true)
    // )
    // .addStringOption((option) =>
    //   option
    //     .setName("country")
    //     .setDescription("The country you're in.")
    //     .setRequired(true)
    // )
    // .addBooleanOption((option) =>
    //   option
    //     .setName("used-ace")
    //     .setDescription("Have you used the ACE mod before?")
    //     .setRequired(true)
    // )
    // .addBooleanOption((option) =>
    //   option
    //     .setName("used-acre-or-tfar")
    //     .setDescription("Have you used ACRE or TFAR before?")
    //     .setRequired(true)
    // )
    async execute({ interaction }) {
      const applicationData = {
        name: interaction.options.getString("name"),
        age: interaction.options.getInteger("age"),
        country: interaction.options.getString("country"),
        usedAce: interaction.options.getBoolean("used-ace"),
        usedAcreOrTfar: interaction.options.getBoolean("used-acre-or-tfar"),
      };

      const applicationsChannel = uagChannel("applications");

      await applicationsChannel.send(
        `New application from ${interaction.user.tag}:\n\n` +
          `Name: ${applicationData.name}\n` +
          `Age: ${applicationData.age}\n` +
          `Country: ${applicationData.country}\n` +
          `Used ACE: ${applicationData.usedAce}\n` +
          `Used ACRE/TFAR: ${applicationData.usedAcreOrTfar}`
      );

      await interaction.reply({
        content: `Your application has been received! A member of our recruitment team will reach out to you soon.`,
        ephemeral: true,
      });
    },
  },
};
