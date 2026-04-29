import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function start() {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  });

  async function shutdown(signal: string) {
    console.log(`\n${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("💤 Server closed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
