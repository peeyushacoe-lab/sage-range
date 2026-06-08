import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;       // Keycloak sub (externalId in DB)
      email: string;
      name?: string | null;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, account, profile }) {
      // On first sign-in, persist Keycloak sub into the JWT
      if (account?.provider === "keycloak" && profile) {
        const kc = profile as { sub?: string; email?: string; name?: string };
        if (kc.sub) token.sub = kc.sub;
        if (kc.email) token.email = kc.email;
        if (kc.name) token.name = kc.name;
      }
      return token;
    },
    session({ session, token }) {
      // Expose Keycloak sub as session.user.id so getOrCreateAppUser can look it up
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
