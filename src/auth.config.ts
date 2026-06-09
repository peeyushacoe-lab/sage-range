import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

// Edge-compatible config — no Prisma, no Credentials, used by middleware only
export const authConfig: NextAuthConfig = {
  providers: [Google, GitHub],
  pages: { signIn: "/sign-in" },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
  },
};
