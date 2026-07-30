import { redirect } from "next/navigation";
import Image from "next/image";
import { headers } from "next/headers";
import type { CSSProperties } from "react";
import QRCode from "qrcode";
import { Playfair_Display } from "next/font/google";
import { getOrCreateAppUser } from "@/lib/current-user";
import { buildTranscript } from "@/lib/insights/transcript";
import { Navbar } from "@/components/navbar";
import { TranscriptActions } from "./_components/transcript-actions";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"] });

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate — Sage Vault" };

const NAVY = "#0c1a3a";
const GOLD = "#b8902f";
const CREAM = "#faf7f0";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function Corner({ style }: { style: CSSProperties }) {
  return <div className="absolute w-6 h-6" style={{ borderColor: GOLD, ...style }} />;
}

const Icon = {
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={1.6} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={1.6} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill={NAVY} />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={1.6} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l9 5 9-5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={1.6} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={1.6} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v14a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" d="M9 12h6M9 16h6" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth={2.4} className="w-3.5 h-3.5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4 10-10" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.6} className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" />
    </svg>
  ),
};

export default async function TranscriptPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const t = await buildTranscript(user.id);
  if (!t) redirect("/dashboard");

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const verifyUrl = `${proto}://${host}/transcript?verify=${t.verificationId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1, width: 200, color: { dark: NAVY, light: "#00000000" },
  });

  const pathLabel = t.primaryPath?.title.toUpperCase() ?? "SAGE VAULT TRAINING";
  const capstoneLabel = t.primaryCapstone
    ? `${t.primaryCapstone.slug.toUpperCase()} · ${t.primaryCapstone.title.toUpperCase()}`
    : null;

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/dashboard" backLabel="Dashboard" />

      <div className="max-w-5xl mx-auto px-6 py-8 print:py-0 print:px-0 print:max-w-none">
        <div className="flex justify-end mb-4 print:hidden">
          <TranscriptActions />
        </div>

        {/* Outer navy frame */}
        <div className="rounded-2xl p-2" style={{ background: NAVY }}>
          <div className="relative rounded-xl p-1" style={{ border: `1.5px solid ${GOLD}` }}>
            <Corner style={{ top: 6, left: 6, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
            <Corner style={{ top: 6, right: 6, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
            <Corner style={{ bottom: 6, left: 6, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
            <Corner style={{ bottom: 6, right: 6, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />

            <div className="rounded-lg overflow-hidden" style={{ background: CREAM }}>
              <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1fr]">
                {/* Main content */}
                <div className="px-8 sm:px-12 pt-10 pb-8">
                  <div className="flex items-center gap-3 mb-8">
                    <Image src="/logo.png" alt="Sage Vault" width={44} height={44} className="rounded" />
                    <div>
                      <p className={`${serif.className} text-2xl font-bold tracking-wide`} style={{ color: NAVY }}>CYBERSAGE</p>
                      <div className="flex items-center gap-2">
                        <span className="h-px w-6" style={{ background: GOLD }} />
                        <span className="text-xs tracking-[0.25em] font-medium" style={{ color: GOLD }}>SAGE VAULT</span>
                        <span className="h-px w-6" style={{ background: GOLD }} />
                      </div>
                    </div>
                  </div>

                  <h1 className={`${serif.className} text-5xl sm:text-6xl font-bold leading-none mb-2`} style={{ color: NAVY }}>
                    CERTIFICATE
                  </h1>
                  <div className="flex items-center gap-3 mb-8">
                    <span className="h-px flex-1 max-w-10" style={{ background: GOLD }} />
                    <span className="text-sm tracking-[0.3em] font-semibold" style={{ color: GOLD }}>OF COMPLETION</span>
                    <span className="h-px flex-1 max-w-10" style={{ background: GOLD }} />
                  </div>

                  <p className="text-xs tracking-[0.2em] text-ink-3 mb-3">THIS IS TO CERTIFY THAT</p>
                  <p className={`${serif.className} text-5xl mb-4`} style={{ color: NAVY }}>{t.displayName}</p>

                  <p className="text-sm text-ink-3 mb-1">has successfully completed the</p>
                  <p className="text-lg font-bold tracking-wide mb-3" style={{ color: NAVY }}>{pathLabel}</p>
                  <p className="text-sm text-ink-3 leading-relaxed mb-6 max-w-md">
                    including {t.bossFightsPassed.length} Boss Fight simulation{t.bossFightsPassed.length === 1 ? "" : "s"},
                    {" "}{t.labsSolved} hands-on lab{t.labsSolved === 1 ? "" : "s"}, and {t.hoursTrained} hours of practical training.
                  </p>

                  {capstoneLabel && (
                    <div className="inline-flex items-center gap-3 border rounded-lg px-4 py-3 mb-8" style={{ borderColor: GOLD }}>
                      {Icon.shield}
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.15em]" style={{ color: GOLD }}>CAPSTONE ASSESSMENT</p>
                        <p className="text-xs font-semibold" style={{ color: NAVY }}>{capstoneLabel}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-6 mt-4">
                    <div>
                      <Image src="/certificates/ceo-signature.png" alt="CEO signature" width={150} height={26} />
                      <p className="w-40 border-b mt-0.5 mb-1.5" style={{ borderColor: "#c9c2b0" }}>&nbsp;</p>
                      <p className="text-[10px] font-bold tracking-wider" style={{ color: NAVY }}>CHIEF EXECUTIVE OFFICER</p>
                      <p className="text-[10px] tracking-wider text-ink-3">CYBERSAGE</p>
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-center"
                        style={{ border: `2px dashed ${GOLD}`, color: GOLD }}
                      >
                        <span className="text-[8px] font-bold tracking-wider leading-tight">OFFICIAL<br />SEAL OF<br />CYBERSAGE</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`${serif.className} text-sm font-semibold`} style={{ color: NAVY }}>{fmtDate(t.issuedAt)}</p>
                      <p className="w-32 border-b mt-0.5 mb-1.5 ml-auto" style={{ borderColor: "#c9c2b0" }}>&nbsp;</p>
                      <p className="text-[10px] font-bold tracking-wider text-right" style={{ color: NAVY }}>ISSUED ON</p>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="px-6 sm:px-8 pt-10 pb-8 md:border-l" style={{ borderColor: "#e4dcc8" }}>
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {Icon.clock}
                        <p className="text-[10px] font-bold tracking-[0.12em]" style={{ color: NAVY }}>TRAINING HOURS</p>
                      </div>
                      <p className="text-sm text-ink-3 ml-7">{t.hoursTrained} Hours</p>
                      <div className="h-px mt-3" style={{ background: "#e4dcc8" }} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {Icon.target}
                        <p className="text-[10px] font-bold tracking-[0.12em]" style={{ color: NAVY }}>MITRE ATT&amp;CK COVERAGE</p>
                      </div>
                      <p className="text-sm text-ink-3 ml-7">{t.mitreCoveragePct}%</p>
                      <div className="h-px mt-3" style={{ background: "#e4dcc8" }} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        {Icon.layers}
                        <p className="text-[10px] font-bold tracking-[0.12em]" style={{ color: NAVY }}>COVERED DOMAINS</p>
                      </div>
                      <div className="ml-7 space-y-1">
                        {t.coveredDomains.length > 0 ? t.coveredDomains.map((d) => (
                          <div key={d} className="flex items-center gap-1.5">
                            {Icon.check}
                            <span className="text-xs text-ink-3">{d}</span>
                          </div>
                        )) : <p className="text-xs text-ink-3">Training in progress</p>}
                      </div>
                      <div className="h-px mt-3" style={{ background: "#e4dcc8" }} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {Icon.shield}
                        <p className="text-[10px] font-bold tracking-[0.12em]" style={{ color: NAVY }}>CERTIFICATE ID</p>
                      </div>
                      <p className="text-xs text-ink-3 ml-7 font-mono">{t.verificationId}</p>
                      <div className="h-px mt-3" style={{ background: "#e4dcc8" }} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {Icon.doc}
                        <p className="text-[10px] font-bold tracking-[0.12em]" style={{ color: NAVY }}>CERTIFICATE NO.</p>
                      </div>
                      <p className="text-xs text-ink-3 ml-7 font-mono">{t.certificateNo}</p>
                      <div className="h-px mt-3" style={{ background: "#e4dcc8" }} />
                    </div>

                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="Verification QR code" width={72} height={72} className="border" style={{ borderColor: "#e4dcc8" }} />
                      <div>
                        <p className="text-[10px] font-bold tracking-[0.12em] mb-1" style={{ color: NAVY }}>VERIFY CERTIFICATE</p>
                        <p className="text-[11px] text-ink-3 leading-snug">Scan the QR code to confirm this certificate is authentic.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer bar */}
              <div className="px-6 sm:px-8 py-2.5 flex items-center justify-center gap-3 flex-wrap text-[10px]" style={{ background: NAVY, color: "#cfd6e8" }}>
                <span className="flex items-center gap-1.5">{Icon.globe} Sage Vault</span>
                <span className="opacity-40">|</span>
                <span>Professional Training. Practical Skills. Real-World Impact.</span>
                <span className="opacity-40">|</span>
                <span>Verification ID {t.verificationId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
