import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import ActivityType from "./helpers/ActivityType.js";
import internal from "stream";

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
