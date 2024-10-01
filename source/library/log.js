import { insertOne } from "../controllers/mongodb.js";

export default async function log(message) {
  console.log(message);

  await insertOne("logs", {
    timestamp: new Date(),
    message,
  });
}
