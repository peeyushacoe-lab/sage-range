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
    // Expose role from the JWT token so middleware can read it without a DB call
    session({ session, token }) {
      if (token.role) session.user.role = token.role as string;
      if (token.id)   session.user.id   = token.id as string;
      return session;
    },
  },
};
