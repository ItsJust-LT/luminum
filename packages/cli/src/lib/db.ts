import { createPrismaClient } from "@luminum/database";
import type { PrismaClient } from "@luminum/database";

export { type PrismaClient };

export async function withDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Set it in .env or the environment.");
    process.exitCode = 1;
    throw new Error("DATABASE_URL missing");
  }

  const prisma = createPrismaClient();
  try {
    return await fn(prisma);
  } catch (err) {
    if ((err as Error).message !== "DATABASE_URL missing") {
      console.error("Error:", (err as Error).message);
      process.exitCode = 1;
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
