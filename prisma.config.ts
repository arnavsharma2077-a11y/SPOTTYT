import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Falls back to an empty string placeholder if Vercel hasn't injected the variable yet
    url: process.env.DATABASE_URL || "",
  },
});