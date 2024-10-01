import { SlashCommandBuilder } from "discord.js";

import { upsertOne } from "../controllers/mongodb.js";

export default {
  data: new SlashCommandBuilder()
    .setName("preferences")
    .setDescription("Manage your preferences for the unit.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("help")
        .setDescription("Get help with the preferences command.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("import")
        .setDescription("Import your preferences from the online generator.")
        .addStringOption((option) =>
          option
            .setName("preferences_string")
            .setDescription(
              "The preferences string exported from the online generator."
            )
            .setRequired(true)
        )
    ),
  async execute({ interaction }) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "help":
        await preferencesHelp();
        break;
      case "import":
        await preferencesImport(interaction);
        break;
      default:
        await interaction.reply("Unknown subcommand.");
        break;
    }
  },
};

async function preferencesHelp() {
  let message = "# Preferences Commands Help";
  message += "\n";
  message +=
    "To use this command, you need to go to the [online generator](https://steppenwauwau.uagpmc.com/preferences-generator.html) and generate a preferences string. Then, you can use the `/preferences import` command and the bot will parse the preferences string and save it to the database.";

  await interaction.reply(message);
}

async function preferencesImport(interaction) {
  const preferencesString = interaction.options.getString("preferences_string");

  if (!preferencesString) {
    await interaction.reply("Preferences string is required.");
    return;
  }

  // parse the preferences string
  // example string: rifleman=sometimes&autorifleman=never&grenadier=never&marksman=often&pointman=never&medic=never&corpsman=never&sniper=sometimes&armour_crew=always&helicopter_pilot=never&fixed-wing_pilot=rarely&leadership=never
  const preferences = preferencesString.split("&").reduce((acc, pref) => {
    const [role, value] = pref.split("=");
    acc[role] = value;
    return acc;
  }, {});

  // upsert the preferences into the database
  await upsertOne(
    "members",
    { discordId: interaction.user.id },
    {
      $set: {
        discordId: interaction.user.id,
        discordLastKnownTag: interaction.user.tag,
        preferences,
      },
    }
  );

  await interaction.reply({
    content: "Preferences imported successfully.",
    ephemeral: true,
  });
}
