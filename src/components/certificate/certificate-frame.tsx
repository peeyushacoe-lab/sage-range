import Image from "next/image";
import { CEO_SIGNATURE_DATA_URI } from "./signature-data";

// Shared formal certificate design (navy/gold/cream, landscape) used by the
// Learning Path, Academy, IR verification, and Simulation certificate pages —
// single source of truth so all four render the same brand design.

const NAVY = "#1b2a4a";
const GOLD = "#b8923d";
const GOLD_SOFT = "#d8c9a3";
const CREAM = "#faf6ee";
const SERIF = "Georgia, 'Times New Roman', serif";

export type SidebarStat = { icon: SidebarIcon; label: string; value: string };
export type SidebarList = { icon: SidebarIcon; label: string; items: string[] };
export type SidebarIcon = "clock" | "target" | "layers" | "shield" | "doc";

export type CertificateFrameProps = {
  recipientName: string;
  /** e.g. "has successfully completed the" */
  intro: string;
  /** Main achievement line, rendered uppercase serif — e.g. the path/course name */
  title: string;
  /** Small supporting line under the title */
  detail?: string;
  /** Optional highlighted capstone box — e.g. "EDU-2026-002 · Domain Takeover Investigation" */
  capstone?: string;
  issuedOn: Date;
  stats?: SidebarStat[];
  lists?: SidebarList[];
  /** Pre-rendered SVG markup from certificateQrSvg() plus the display text under it */
  verify?: { qrSvg: string; display: string };
};

const ICONS: Record<SidebarIcon, React.ReactNode> = {
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" className="w-6 h-6">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" strokeLinecap="round" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" className="w-6 h-6">
      <path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" strokeLinejoin="round" />
      <path d="m2.5 13 9.5 5 9.5-5" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" className="w-6 h-6">
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10v-6l-8-3Z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="1.8" className="w-6 h-6">
      <path d="M6 2.5h8l4 4v15H6v-19Z" strokeLinejoin="round" />
      <path d="M14 2.5v4h4M9 12h6M9 15.5h6" strokeLinecap="round" />
    </svg>
  ),
};

function sealPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / teeth - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

function GoldSeal() {
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 drop-shadow-md" aria-hidden>
      <defs>
        <radialGradient id="sealGold" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#f3d98b" />
          <stop offset="55%" stopColor="#d4af5a" />
          <stop offset="100%" stopColor="#a07c2e" />
        </radialGradient>
      </defs>
      <path d={sealPath(60, 60, 58, 52, 36)} fill="url(#sealGold)" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#8a6a26" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="#f3d98b" strokeWidth="1" />
      <text x="60" y="47" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#3d2f10" style={{ fontFamily: SERIF }}>
        OFFICIAL
      </text>
      <text x="60" y="60" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#3d2f10" style={{ fontFamily: SERIF }}>
        SEAL OF
      </text>
      <text x="60" y="73" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#3d2f10" style={{ fontFamily: SERIF }}>
        CYBERSAGE
      </text>
      <text x="60" y="88" textAnchor="middle" fontSize="9" fill="#3d2f10">★ ★ ★</text>
    </svg>
  );
}

export function CertificateFrame({
  recipientName, intro, title, detail, capstone, issuedOn, stats = [], lists = [], verify,
}: CertificateFrameProps) {
  const issued = issuedOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="rounded-sm p-2.5 shadow-2xl" style={{ background: NAVY }}>
      <div className="border-2 p-1" style={{ borderColor: GOLD }}>
        <div className="border" style={{ borderColor: GOLD_SOFT, background: CREAM }}>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_265px]">
            {/* ── Main column ─────────────────────────────────────────── */}
            <div className="px-8 sm:px-12 pt-10 pb-8 text-center" style={{ fontFamily: SERIF }}>
              <div className="flex items-center justify-center gap-3 mb-1">
                <Image src="/logo.png" alt="" width={54} height={54} className="opacity-95" unoptimized />
                <p className="text-3xl sm:text-4xl font-bold tracking-[0.12em]" style={{ color: NAVY }}>
                  CYBERSAGE
                </p>
              </div>
              <p className="text-[11px] font-semibold tracking-[0.45em] mb-7" style={{ color: GOLD }}>
                — SAGE VAULT —
              </p>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-[0.06em]" style={{ color: NAVY }}>
                CERTIFICATE
              </h1>
              <p className="text-sm sm:text-base font-semibold tracking-[0.4em] mt-2 mb-8" style={{ color: GOLD }}>
                — OF COMPLETION —
              </p>

              <p className="text-[11px] tracking-[0.35em] mb-3" style={{ color: NAVY }}>
                THIS IS TO CERTIFY THAT
              </p>
              <p className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: NAVY }}>
                {recipientName}
              </p>

              <div className="flex items-center justify-center gap-2 mb-5" aria-hidden>
                <span className="h-px w-24" style={{ background: GOLD_SOFT }} />
                <span className="text-xs" style={{ color: GOLD }}>◆◆</span>
                <span className="h-px w-24" style={{ background: GOLD_SOFT }} />
              </div>

              <p className="text-sm text-zinc-600 mb-2">{intro}</p>
              <p className="text-xl sm:text-2xl font-bold uppercase tracking-[0.05em] mb-2" style={{ color: NAVY }}>
                {title}
              </p>
              {detail && <p className="text-sm text-zinc-600 max-w-xl mx-auto leading-relaxed">{detail}</p>}

              {capstone && (
                <div className="inline-flex items-center gap-3 border rounded-lg px-5 py-3 mt-6 text-left" style={{ borderColor: GOLD }}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm" style={{ background: NAVY, color: CREAM }}>
                    ★
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold tracking-[0.25em]" style={{ color: GOLD }}>
                      CAPSTONE ASSESSMENT
                    </span>
                    <span className="block text-sm font-semibold" style={{ color: NAVY }}>{capstone}</span>
                  </span>
                </div>
              )}

              {/* Signature · Seal · Date */}
              <div className="flex flex-wrap items-end justify-between gap-6 mt-10">
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={CEO_SIGNATURE_DATA_URI} alt="CEO signature" width={190} height={32} className="mx-auto" />
                  <p className="w-48 border-b mb-2" style={{ borderColor: GOLD_SOFT }} />
                  <p className="text-xs font-bold tracking-[0.15em]" style={{ color: NAVY }}>KHURRAM QAMAR</p>
                  <p className="text-[10px] tracking-[0.12em] text-zinc-500">CHIEF EXECUTIVE OFFICER</p>
                  <p className="text-[10px] tracking-[0.12em] text-zinc-500">CYBERSAGE UK</p>
                </div>
                <GoldSeal />
                <div className="text-center">
                  <p className="text-lg font-bold pb-1" style={{ color: NAVY }}>{issued}</p>
                  <p className="w-40 border-b mb-2 mx-auto" style={{ borderColor: GOLD_SOFT }} />
                  <p className="text-[10px] tracking-[0.3em] text-zinc-500">ISSUED ON</p>
                </div>
              </div>
            </div>

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <div className="border-t lg:border-t-0 lg:border-l px-7 py-9 flex flex-col gap-5" style={{ borderColor: GOLD_SOFT }}>
              {stats.map((s) => (
                <div key={s.label} className="flex items-start gap-3 pb-5 border-b last:border-b-0" style={{ borderColor: GOLD_SOFT }}>
                  <span className="shrink-0 mt-0.5">{ICONS[s.icon]}</span>
                  <span>
                    <span className="block text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase">{s.label}</span>
                    <span className="block text-base font-semibold mt-0.5" style={{ color: NAVY }}>{s.value}</span>
                  </span>
                </div>
              ))}

              {lists.map((l) => (
                <div key={l.label} className="flex items-start gap-3 pb-5 border-b" style={{ borderColor: GOLD_SOFT }}>
                  <span className="shrink-0 mt-0.5">{ICONS[l.icon]}</span>
                  <span>
                    <span className="block text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-1.5">{l.label}</span>
                    {l.items.map((item) => (
                      <span key={item} className="flex items-center gap-1.5 text-[13px] leading-6" style={{ color: NAVY }}>
                        <span style={{ color: GOLD }}>✓</span> {item}
                      </span>
                    ))}
                  </span>
                </div>
              ))}

              {verify && (
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-[74px] h-[74px] border p-1.5 bg-white [&_svg]:w-full [&_svg]:h-full"
                    style={{ borderColor: GOLD }}
                    dangerouslySetInnerHTML={{ __html: verify.qrSvg }}
                  />
                  <span>
                    <span className="block text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: NAVY }}>
                      Verify Certificate
                    </span>
                    <span className="block text-[11px] text-zinc-500 mt-1">Scan QR code or visit</span>
                    <span className="block text-[11px] font-semibold break-all" style={{ color: "#2456a6" }}>{verify.display}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom bar ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-8 py-3 text-[11px] tracking-wide" style={{ background: NAVY, color: "#e8e2d4" }}>
            <span className="flex items-center gap-1.5">
              <span aria-hidden>🌐</span> www.cybersagevault.uk
            </span>
            <span className="italic" style={{ fontFamily: SERIF }}>
              Professional Training. Practical Skills. Real-World Impact.
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden style={{ color: GOLD }}>🛡</span> cybersagevault.uk/verify
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
