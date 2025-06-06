import { Role } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  /**
   * Extend the built-in user types
   */
  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extend the JWT type
   */
  interface JWT {
    id: string;
    role: Role;
  }
}
