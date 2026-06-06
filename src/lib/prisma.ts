import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

type PrismaGlobal = {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

const globalForPrisma = globalThis as unknown as PrismaGlobal;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env file at the project root.",
    );
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getDatabaseUrl();
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prismaDatabaseUrl === databaseUrl && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = databaseUrl;
}
