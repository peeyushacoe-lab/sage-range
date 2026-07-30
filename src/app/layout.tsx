import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { SearchModal } from "@/components/search-modal";
import { IconGradients } from "@/components/ui/icon-gradients";
import "./globals.css";

/**
 * Range type pairing. Plex Sans for prose, Plex Mono for anything a machine
 * produced — hashes, IOCs, CVEs, rule IDs, log lines, and every small label.
 * `display: swap` so text is never invisible while the font loads.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

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
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        <IconGradients />
        <SessionProvider>
          {children}
          <CookieConsent />
          <SearchModal />
        </SessionProvider>
      </body>
    </html>
  );
}
