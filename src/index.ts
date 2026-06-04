import dotenv from "dotenv";

import { startServer } from "./server.js";

dotenv.config();

async function main() {
  try {
    await startServer(process.env);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown startup error.";
    console.error(message);
    process.exit(1);
  }
}

void main();
