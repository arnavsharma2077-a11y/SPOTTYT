import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      connectedProviders: string[];
    } & DefaultSession["user"];
  }
}
