import { Routes } from "discord.js";
import { readdirSync } from "fs";

export default async (client) => {
  const commands = [];

  for (const file of readdirSync(`./source/commands`)) {
    const { default: command } = await import(`../commands/${file}`);
    commands.push(command.data);
  }

  await client.rest.put(
    Routes.applicationGuildCommands(
      client.application.id,
      process.env.DISCORD_GUILD_ID
    ),
    {
      body: commands,
    }
  );

  console.log("Slash commands registered!");
};
