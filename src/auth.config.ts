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
    // Expose role/access from the JWT token so middleware can read it without a DB call
    session({ session, token }) {
      if (token.role) session.user.role = token.role as string;
      if (token.id)   session.user.id   = token.id as string;
      // Same fail-open default as auth.ts: a token signed before this field
      // existed has no claim at all and must not be treated as denied.
      session.user.hasAccess = typeof token.hasAccess === "boolean" ? token.hasAccess : true;
      return session;
    },
  },
};
