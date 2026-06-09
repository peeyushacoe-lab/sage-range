import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible config — no Prisma, used by middleware only
export const authConfig: NextAuthConfig = {
  providers: [
    Google,
    GitHub,
    Credentials({ credentials: { email: {}, password: {} } }),
  ],
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
  },
};
