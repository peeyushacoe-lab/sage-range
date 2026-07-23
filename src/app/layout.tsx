import type { Metadata } from "next";
import { SessionProvider } from "@/components/session-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { SearchModal } from "@/components/search-modal";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sage Vault by CyberSage",
    template: "%s · Sage Vault",
  },
  description:
    "Sage Vault by CyberSage — hands-on cybersecurity labs, live incident simulations, classroom management, and verified talent assessment. Intelligence. Simulation. Resilience.",
  keywords: ["cybersecurity training", "cyber range", "incident response simulation", "SOC training", "MITRE ATT&CK", "CyberSage", "Sage Vault"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <CookieConsent />
          <SearchModal />
        </SessionProvider>
      </body>
    </html>
  );
}
