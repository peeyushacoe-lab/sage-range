import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    GitHub,
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
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user.email) return false;
      await db.user.upsert({
        where: { email: user.email },
        update: {},
        create: { email: user.email, displayName: user.name ?? null },
      });
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        if (user.id) {
          token.id = user.id;
          const dbUser = await db.user.findUnique({ where: { id: user.id } });
          token.role = (dbUser?.role as string) ?? "STUDENT";
        } else if (user.email) {
          const dbUser = await db.user.findUnique({ where: { email: user.email } });
          if (dbUser) { token.id = dbUser.id; token.role = dbUser.role as string; }
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
