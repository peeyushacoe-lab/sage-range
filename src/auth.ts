import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import { autoJoinOrganizationByDomain } from "@/lib/organization";
import { verifyNexusToken, provisionNexusUser } from "@/lib/nexus-sso";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.displayName };
      },
    }),
    Credentials({
      id: "nexus",
      name: "Nexus SSO",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token as string | undefined;
        if (!token) { console.error("[nexus-sso] no token"); return null; }

        const claims = await verifyNexusToken(token);
        if (!claims) { console.error("[nexus-sso] token verification failed — bad secret, expired, or missing claims"); return null; }

        console.log("[nexus-sso] claims ok, provisioning user", claims.email);
        try {
          const user = await provisionNexusUser(claims);
          return { id: user.id, email: user.email, name: user.displayName };
        } catch (e) {
          console.error("[nexus-sso] provisionNexusUser threw:", e);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      // Credentials providers (password login, Nexus SSO) already do their own
      // account creation/provisioning inside authorize() — this callback is only
      // for OAuth providers (Google/GitHub) that don't have a custom authorize().
      if (account?.provider === "credentials" || account?.provider === "nexus") return true;
      if (!user.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email } });
      if (!existing) {
        const created = await db.user.create({ data: { email: user.email, displayName: user.name ?? null } });
        await autoJoinOrganizationByDomain(created.id, created.email);
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.email) {
        // Always look up by email — user.id for OAuth is the provider's ID, not our DB CUID
        const dbUser = await db.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as string;
        }
      }
      if (trigger === "update" && typeof token.id === "string") {
        const dbUser = await db.user.findUnique({ where: { id: token.id } });
        if (dbUser) token.role = dbUser.role as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = (token.role as string) ?? "STUDENT";
      return session;
    },
  },
});
