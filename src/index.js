import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  ActivityType,
  Partials,
  AllowedMentionsTypes,
} from "discord.js";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const firebaseApp = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});

const firestore = getFirestore();

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
        name: `enemy comms...`,
      },
    ],
  });
});

client.on(Events.GuildMemberAdd, async (member) => {
  await sendMemberIntro(member);
});

client.on(Events.GuildMemberAvailable, async (member) => {
  await sendMemberIntro(member);
});

client.on(Events.GuildMemberRemove, async (member) => {
  await sendMemberGoodbye(member);
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
  intro += `It's simple! Just head over to our [recruitment-text channel](${recruitmentUrl}) in the Discord use the \`/apply\` command to get started. You'll be asked a few questions about your experience with Arma and what you're looking for in a group. Once you've filled out the application, a member of our recruitment team will reach out to you to schedule a quick interview. Don't worry, it's nothing too serious! We just want to make sure you'll fit in with our group so you can have the best experience possible.`;
  intro += `\n\n`;
  intro += `## Anything else?`;
  intro += `\n\n`;
  intro += `If you have any questions, feel free to ask in the [recruitment-text channel](${recruitmentUrl}) and someone will be happy to help you out!`;
  intro += `\n\n`;
  intro += `Oh, and if you somehow leave the Discord server, don't worry! You can always rejoin by clicking [here](https://uagpmc.com/discord).`;

  try {
    await member.send(intro);
  } catch (error) {
    console.error(`Failed to send intro to ${member}: ${error}`);
  }
}

async function sendMemberGoodbye(member) {
  let goodbye = `# It looks like you've left Unnamed Arma Group!`;
  goodbye += `\n\n`;
  goodbye += `Goodbye, ${member}!`;
  goodbye += `\n\n`;
  goodbye += `We're all sorry to see you go! If you ever change your mind, you can always rejoin by clicking [here](https://uagpmc.com/discord).`;

  try {
    await member.send(goodbye);
  } catch (error) {
    console.error(`Failed to send goodbye to ${member}: ${error}`);
  }
}

function uagChannel(name) {
  return client.guilds.cache
    .get(process.env.DISCORD_GUILD_ID)
    .channels.cache.find((channel) => channel.name === name);
}

const preferences_roles = [
  {
    name: "rifleman",
    description:
      "The backbone of the team, providing suppressive fire and maneuvering to outflank the enemy.",
  },
  {
    name: "autorifleman",
    description: "High-volume suppressive fire assault infantry.",
  },
  {
    name: "grenadier",
    description: "High-angle indirect fire support infantry.",
  },
  {
    name: "marksman",
    description:
      "Long-range high-precision anti-personnel fire support infantry.",
  },
  {
    name: "pointman",
    description: "Close-quarters anti-garrison infantry. Shotgun specialist.",
  },
  {
    name: "medic",
    description:
      "Primary medical support, including first aid, triage, treatment, surgery, and evacuation.",
  },
  {
    name: "corpsman",
    description: "Assists the medic by providing first-response medical care.",
  },
  {
    name: "sniper",
    description: "Pathfinder and long-range anti-material specialist.",
  },
  {
    name: "armour_crew",
    description:
      "Armoured-vehicle crew. Driver, gunner, and loader for tanks and APCs. Doesn't include commander role, see leadership for that.",
  },
  {
    name: "heli_pilot",
    description: "Rotary-wing pilot.",
  },
  {
    name: "jet_pilot",
    description: "Fixed-wing pilot.",
  },
  {
    name: "leadership",
    description:
      "Team leaders, section commanders, tank commanders, wing commanders, etc.",
  },
];

const preferences_roles_choices = [
  {
    name: "never",
    value: 1,
  },
  {
    name: "sometimes",
    value: 2,
  },
  {
    name: "always",
    value: 3,
  },
];

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
      )
      .addIntegerOption((option) =>
        option.setName("age").setDescription("Your age.").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("country")
          .setDescription("The country you're in.")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("used-ace")
          .setDescription("Have you used the ACE mod before?")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("used-acre-or-tfar")
          .setDescription("Have you used ACRE or TFAR before?")
          .setRequired(true)
      )
      .addBooleanOption((option) =>
        option
          .setName("returning-member")
          .setDescription("Are you a returning member?")
          .setRequired(true)
      ),
    async execute({ interaction }) {
      const applicationData = {
        name: interaction.options.getString("name"),
        age: interaction.options.getInteger("age"),
        country: interaction.options.getString("country"),
        usedAce: interaction.options.getBoolean("used-ace"),
        usedAcreOrTfar: interaction.options.getBoolean("used-acre-or-tfar"),
        returningMember: interaction.options.getBoolean("returning-member"),
      };

      const applicationsChannel = uagChannel("applications");

      await applicationsChannel.send(
        `New application from ${interaction.user}:\n\n` +
          "```json\n" +
          JSON.stringify(applicationData, null, 2) +
          "```"
      );

      await interaction.reply({
        content: `Your application has been received! A member of our recruitment team will reach out to you soon.`,
        ephemeral: true,
      });
    },
  },
  preferences: {
    data: new SlashCommandBuilder()
      .setName("preferences")
      .setDescription("Set your preferences for the unit.")
      .addSubcommandGroup((group) =>
        group
          .setName("roles")
          .setDescription(
            "Your in-game role preferences. Use `/preferences roles list` for more information on each role."
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("list")
              .setDescription(
                "List all available roles and their descriptions."
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("set")
              .setDescription("Set your role preferences.")
              .addStringOption((option) =>
                option
                  .setName("role")
                  .setDescription("The role you want to set.")
                  .setRequired(true)
                  .addChoices(
                    preferences_roles.map((role) => ({
                      name: role.name,
                      value: role.name,
                    }))
                  )
              )
              .addIntegerOption((option) =>
                option
                  .setName("preference")
                  .setDescription("Your preference for this role.")
                  .setRequired(true)
                  .addChoices(...preferences_roles_choices)
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("get")
              .setDescription("Get your role preferences.")
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("remove")
              .setDescription("Remove a role preference.")
              .addStringOption((option) =>
                option
                  .setName("role")
                  .setDescription("The role you want to remove.")
                  .setRequired(true)
                  .addChoices(
                    preferences_roles.map((role) => ({
                      name: role.name,
                      value: role.name,
                    }))
                  )
              )
          )
          .addSubcommand((subcommand) =>
            subcommand
              .setName("clear")
              .setDescription("Clear all your role preferences.")
          )
      ),
    async execute({ interaction }) {
      const subcommand = interaction.options.getSubcommand();
      const subcommandGroup = interaction.options.getSubcommandGroup();

      switch (subcommandGroup) {
        case "roles":
          switch (subcommand) {
            case "list":
              (async () => {
                await interaction.reply({
                  content:
                    `# Available roles:\n\n` +
                    preferences_roles
                      .map((role) => `**${role.name}**: ${role.description}\n`)
                      .join(""),
                  ephemeral: true,
                });
              })();
              break;
            case "set":
              (async () => {
                const role = interaction.options.getString("role");
                const preference = interaction.options.getInteger("preference");

                await firebaseMergeDocument(
                  interaction.guild.id,
                  interaction.user.id,
                  {
                    _: {
                      lastKnownGuildName: interaction.guild.name,
                      lastKnownUserTag: interaction.user.tag,
                      updatedAtDate: new Date(),
                    },
                    preferences: {
                      roles: {
                        [role]: {
                          _: {
                            lastKnownValueName: preferences_roles_choices.find(
                              (choice) => choice.value === preference
                            ).name,
                            updatedAtDate: new Date(),
                          },
                          value: preference,
                        },
                      },
                    },
                  }
                );

                await interaction.reply({
                  content: `You set your preference for **${role}** to \`${
                    preferences_roles_choices.find(
                      (choice) => choice.value === preference
                    ).name
                  }\``,
                  ephemeral: true,
                });
              })();
              break;
            case "get":
              (async () => {
                const role_preferences = (
                  await firebaseGetDocument(
                    interaction.guild.id,
                    interaction.user.id
                  )
                )?.preferences?.roles;

                let role_preferences_filtered = null;

                if (role_preferences)
                  role_preferences_filtered = Object.fromEntries(
                    Object.entries(role_preferences).filter(
                      ([role, value]) => value !== null
                    )
                  );

                if (
                  !role_preferences_filtered ||
                  !Object.keys(role_preferences_filtered).length
                )
                  return await interaction.reply({
                    content: `You haven't set any role preferences yet.`,
                    ephemeral: true,
                  });

                const preferencesText =
                  `# Your role preferences:\n\n` +
                  Object.entries(role_preferences_filtered)
                    .map(
                      ([role, { value }]) =>
                        `**${role}**: ${
                          preferences_roles_choices.find(
                            (choice) => choice.value === value
                          ).name
                        }`
                    )
                    .join("\n");

                await interaction.reply({
                  content: preferencesText,
                  ephemeral: true,
                });
              })();
              break;
            case "remove":
              (async () => {
                const role = interaction.options.getString("role");

                // get the current role preference
                const role_preferences = (
                  await firebaseGetDocument(
                    interaction.guild.id,
                    interaction.user.id
                  )
                )?.preferences?.roles;

                if (!role_preferences || !(role in role_preferences))
                  return await interaction.reply({
                    content: `You haven't set a preference for **${role}** yet.`,
                    ephemeral: true,
                  });

                // set the role preference to null
                await firebaseMergeDocument(
                  interaction.guild.id,
                  interaction.user.id,
                  {
                    preferences: {
                      roles: {
                        [role]: null,
                      },
                    },
                  }
                );

                await interaction.reply({
                  content: `You removed your preference for **${role}**.`,
                  ephemeral: true,
                });
              })();
              break;
            case "clear":
              (async () => {
                // check if the user has any role preferences
                const role_preferences = (
                  await firebaseGetDocument(
                    interaction.guild.id,
                    interaction.user.id
                  )
                )?.preferences?.roles;

                if (!role_preferences)
                  return await interaction.reply({
                    content: `You haven't set any role preferences yet.`,
                    ephemeral: true,
                  });

                // clear all role preferences
                await firebaseMergeDocument(
                  interaction.guild.id,
                  interaction.user.id,
                  {
                    preferences: {
                      roles: null,
                    },
                  }
                );

                await interaction.reply({
                  content: `You cleared all your role preferences.`,
                  ephemeral: true,
                });
              })();
              break;
          }
          break;
      }
    },
  },
};

async function firebaseGetDocument(collection, documentId) {
  const ref = firestore.collection(collection).doc(documentId);
  const doc = await ref.get();

  if (!doc.exists) return null;

  return doc.data();
}

async function firebaseSetDocument(collection, documentId, data) {
  const ref = firestore.collection(collection).doc(documentId);

  await ref.set(data);

  return true;
}

async function firebaseMergeDocument(collection, documentId, data) {
  const ref = firestore.collection(collection).doc(documentId);

  await ref.set(data, { merge: true });

  return true;
}
