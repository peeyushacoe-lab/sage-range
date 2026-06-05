import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sage Forge by CyberSage",
    template: "%s · Sage Forge",
  },
  description:
    "Sage Forge by CyberSage — hands-on cybersecurity labs, live incident simulations, classroom management, and verified talent assessment. Intelligence. Simulation. Resilience.",
  keywords: ["cybersecurity training", "cyber range", "incident response simulation", "SOC training", "MITRE ATT&CK", "CyberSage", "Sage Forge"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider appearance={{ variables: { colorPrimary: "#10b981" } }}>
          {children}
          <CookieConsent />
        </ClerkProvider>
      </body>
    </html>
  );
}
