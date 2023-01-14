import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import ActivityType from "./helpers/ActivityType.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  presence: {
    activities: [
      {
        type: ActivityType.WATCHING,
        name: "my boot logs",
      },
    ],
  },
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // run presenceCountdown() every 30 seconds
  setInterval(presenceCountdown, 30 * 1000);

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
});

client.login(process.env.DISCORD_BOT_TOKEN);

async function presenceCountdown() {
  const result = await fetch("https://api.uagpmc.com/session/next");
  const json = await result.json();
  const { days, hours, minutes, seconds } = json;

  client.user.setPresence({
    activities: [
      {
        type: ActivityType.PLAYING,
        name: `in ${days}d ${hours}h ${minutes}m ${seconds}s`,
      },
    ],
  });
}
