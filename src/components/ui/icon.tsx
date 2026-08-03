/**
 * Sage Vault icon system.
 *
 * Every product concept is a *composition* — Book + Circuit, Radar + Crosshair,
 * Shield + Sword — rendered as a gradient-stroked base glyph with a smaller
 * accent glyph knocked out of its lower-right corner. Lucide supplies the base
 * shapes; three identity concepts (Sage Vault, Boss Fight, AI Mentor) are
 * hand-drawn in ./icon-glyphs.
 *
 * Usage:
 *   <Icon name="learning" size={ICON_SIZE.sidebar} />
 *   <Icon name="bossFight" size={ICON_SIZE.hero} />
 *   <Icon name="check" />                       // plain UI icon, no accent
 *
 * Requires <IconGradients /> mounted once in the root layout.
 */

import {
  Activity, ArrowRight, ArrowUp, Award, Beaker, Bell, Binary, BookOpen, Brain, Bug, Building2,
  Calendar, ChartColumnBig, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock,
  Copy, LoaderCircle, Cloud,
  CircuitBoard, ClipboardList, Drama, Fish, Satellite, Syringe, Bomb, Download,
  PenLine, ScanEye, Skull, User,
  Coins, Compass, Cpu, Crosshair, Crown, Droplet, Eye, FileText, FingerprintPattern,
  Flag, Flame, FolderOpen, Gem, Globe, GraduationCap, Hexagon, Info, Key, Layers, Link2,
  ListChecks, Lock, Map, Medal, Megaphone, Microscope, Monitor, Mountain, Network,
  Newspaper, Pause, Play, Podium, Radar, Ribbon, Rocket, RotateCcw, Scale, Search, Settings, Share2, Shield,
  ShieldCheck, Siren, Sparkles, Star, Swords, Target, Terminal, TrendingUp,
  TriangleAlert, Trophy, Users, Wrench, X, Zap,
  type LucideIcon,
} from "lucide-react";

import { BESPOKE_GLYPHS, type BespokeGlyphName } from "./icon-glyphs";
import { ICON_GRADIENTS, type IconTone } from "./icon-gradients";

/** Typography-paired sizes from the Sage Vault spec. */
export const ICON_SIZE = {
  sidebar: 20,
  card: 24,
  feature: 28,
  hero: 48,
} as const;

type ComposedDef = { base: LucideIcon; accent?: LucideIcon; tone: IconTone };
type BespokeDef = { bespoke: BespokeGlyphName; tone: IconTone };
type IconDef = ComposedDef | BespokeDef;

function isBespoke(def: IconDef): def is BespokeDef {
  return "bespoke" in def;
}

/**
 * Product concepts. Deliberately not generic-cyber: these lean on
 * knowledge / mastery / missions / progression.
 */
const PRODUCT_ICONS = {
  sageVault:     { bespoke: "sageVault", tone: "emerald" },
  bossFight:     { bespoke: "bossFight", tone: "crimson" },
  aiMentor:      { bespoke: "aiMentor",  tone: "purple"  },

  learning:      { base: BookOpen,           accent: CircuitBoard,   tone: "blue"    },
  labs:          { base: Terminal,           accent: Beaker,         tone: "teal"    },
  simulations:   { base: Radar,              accent: Crosshair,      tone: "orange"  },
  challenges:    { base: Flag,               accent: Trophy,         tone: "gold"    },
  dailyMissions: { base: Calendar,           accent: Target,         tone: "blue"    },
  achievements:  { base: Award,              accent: Sparkles,       tone: "amber"   },
  xp:            { base: Star,               accent: TrendingUp,     tone: "gold"    },
  certificates:  { base: Ribbon,             accent: Shield,         tone: "amber"   },
  progress:      { base: Mountain,           accent: Flag,           tone: "emerald" },
  leaderboard:   { base: Podium,             accent: Crown,          tone: "gold"    },
  skills:        { base: Brain,              accent: CircuitBoard,   tone: "purple"  },
  networkMap:    { base: Network,            accent: Share2,         tone: "cyan"    },
  evidenceBoard: { base: FolderOpen,         accent: Search,         tone: "slate"   },
  threatIntel:   { base: Globe,              accent: Radar,          tone: "cyan"    },
  blueTeam:      { base: Shield,             accent: Radar,          tone: "blue"    },
  redTeam:       { base: Swords,             accent: Crosshair,      tone: "crimson" },
  soc:           { base: Monitor,            accent: Activity,       tone: "cyan"    },
  malware:       { base: Bug,                accent: Cpu,            tone: "crimson" },
  forensics:     { base: FingerprintPattern, accent: Search,         tone: "purple"  },
  reports:       { base: FileText,           accent: ChartColumnBig, tone: "slate"   },
  settings:      { base: Settings,           accent: Hexagon,        tone: "slate"   },
} satisfies Record<string, IconDef>;

/**
 * Plain single-glyph UI icons — these replaced the check / cross / close marks
 * and emoji previously scattered through the app. No accent, and they inherit
 * currentColor by default so surrounding text colour classes still apply.
 */
const UI_ICONS = {
  check:        { base: Check,          tone: "emerald" },
  checkCircle:  { base: CircleCheck,    tone: "emerald" },
  cross:        { base: X,              tone: "crimson" },
  close:        { base: X,              tone: "slate"   },
  warning:      { base: TriangleAlert,  tone: "gold"    },
  info:         { base: Info,           tone: "blue"    },
  star:         { base: Star,           tone: "gold"    },
  alert:        { base: Siren,          tone: "crimson" },
  bell:         { base: Bell,           tone: "blue"    },
  chevronDown:  { base: ChevronDown,    tone: "slate"   },
  chevronRight: { base: ChevronRight,   tone: "slate"   },
  chevronLeft:  { base: ChevronLeft,    tone: "slate"   },
  arrowRight:   { base: ArrowRight,     tone: "slate"   },
  clock:        { base: Clock,          tone: "slate"   },
  calendar:     { base: Calendar,       tone: "slate"   },
  copy:         { base: Copy,           tone: "slate"   },
  play:         { base: Play,           tone: "emerald" },
  pause:        { base: Pause,          tone: "slate"   },
  refresh:      { base: RotateCcw,      tone: "slate"   },
  award:        { base: Award,          tone: "gold"    },
  crown:        { base: Crown,          tone: "gold"    },
  target:       { base: Target,         tone: "crimson" },
  loader:       { base: LoaderCircle,   tone: "slate"   },
  search:       { base: Search,         tone: "slate"   },
  lock:         { base: Lock,           tone: "slate"   },
  key:          { base: Key,            tone: "gold"    },
  eye:          { base: Eye,            tone: "slate"   },
  link:         { base: Link2,          tone: "blue"    },
  layers:       { base: Layers,         tone: "slate"   },
  map:          { base: Map,            tone: "cyan"    },
  compass:      { base: Compass,        tone: "cyan"    },
  streak:       { base: Flame,          tone: "orange"  },
  energy:       { base: Zap,            tone: "gold"    },
  coin:         { base: Coins,          tone: "gold"    },
  gem:          { base: Gem,            tone: "purple"  },
  medal:        { base: Medal,          tone: "amber"   },
  trophy:       { base: Trophy,         tone: "gold"    },
  graduation:   { base: GraduationCap,  tone: "blue"    },
  launch:       { base: Rocket,         tone: "orange"  },
  news:         { base: Newspaper,      tone: "slate"   },
  research:     { base: Microscope,     tone: "purple"  },
  announce:     { base: Megaphone,      tone: "orange"  },
  checklist:    { base: ListChecks,     tone: "emerald" },
  clipboard:    { base: ClipboardList,  tone: "slate"   },
  tools:        { base: Wrench,         tone: "slate"   },
  verified:     { base: ShieldCheck,    tone: "emerald" },
  balance:      { base: Scale,          tone: "slate"   },
  blood:        { base: Droplet,        tone: "crimson" },
  users:        { base: Users,          tone: "blue"    },
  globe:        { base: Globe,          tone: "cyan"    },
  org:          { base: Building2,      tone: "slate"   },
  escalate:     { base: ArrowUp,        tone: "orange"  },
  crypto:       { base: Binary,         tone: "purple"  },
  phishing:     { base: Fish,           tone: "orange"  },
  injection:    { base: Syringe,        tone: "crimson" },
  socialEng:    { base: Drama,          tone: "purple"  },
  cloud:        { base: Cloud,          tone: "cyan"    },
  recon:        { base: Satellite,      tone: "cyan"    },
  doc:          { base: FileText,       tone: "slate"   },
  download:     { base: Download,       tone: "slate"   },
  user:         { base: User,           tone: "blue"    },
  note:         { base: PenLine,        tone: "slate"   },
  investigate:  { base: ScanEye,        tone: "purple"  },
  adversary:    { base: Skull,          tone: "crimson" },
  impact:       { base: Bomb,           tone: "crimson" },
} satisfies Record<string, IconDef>;

export const SAGE_ICONS = { ...PRODUCT_ICONS, ...UI_ICONS };
export type IconName = keyof typeof SAGE_ICONS;

/** Names that carry the duotone gradient treatment by default. */
export const PRODUCT_ICON_NAMES = Object.keys(PRODUCT_ICONS) as IconName[];
export const UI_ICON_NAMES = Object.keys(UI_ICONS) as IconName[];

export type IconProps = {
  name: IconName;
  /** px. Use ICON_SIZE tokens: sidebar 20 / card 24 / feature 28 / hero 48. */
  size?: number;
  /** Override the category colour. */
  tone?: IconTone;
  /**
   * "gradient" paints the category gradient (default for product icons).
   * "current" inherits currentColor (default for UI icons) — use inside
   * buttons and links that already manage their own colour.
   */
  variant?: "gradient" | "current";
  /** Hide the corner accent glyph. */
  plain?: boolean;
  strokeWidth?: number;
  className?: string;
  /** Accessible label. Omit for decorative icons. */
  title?: string;
};

export function Icon({
  name,
  size = ICON_SIZE.card,
  tone,
  variant,
  plain = false,
  strokeWidth = 2,
  className,
  title,
}: IconProps) {
  const def = SAGE_ICONS[name] as IconDef;
  const activeTone = tone ?? def.tone;
  const isProduct = (PRODUCT_ICON_NAMES as string[]).includes(name);
  const mode = variant ?? (isProduct ? "gradient" : "current");

  const stroke = mode === "gradient" ? `url(#sv-${activeTone})` : "currentColor";
  const accentColor =
    mode === "gradient" ? ICON_GRADIENTS[activeTone][0] : "currentColor";

  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };

  // Bespoke glyphs are single, self-contained marks — no accent overlay.
  if (isBespoke(def)) {
    const Glyph = BESPOKE_GLYPHS[def.bespoke];
    return (
      <span
        {...a11y}
        className={cx("sv-icon", className)}
        style={{ width: size, height: size }}
      >
        <Glyph size={size} stroke={stroke} strokeWidth={strokeWidth} />
      </span>
    );
  }

  const Base = def.base;
  const Accent = def.accent;
  const showAccent = !plain && !!Accent;

  // Validated by visual proof at 20 / 24 / 44px: the base shrinks to 86% and
  // anchors top-left, the accent badges the lower-right at 46%, and a knockout
  // pass in the surface colour keeps the accent legible where the two cross.
  const baseSize = Math.round(size * (showAccent ? 0.86 : 1));
  const accentSize = Math.round(size * 0.46);

  return (
    <span
      {...a11y}
      className={cx("sv-icon", className)}
      style={{ width: size, height: size }}
    >
      <span className="sv-icon__base">
        <Base size={baseSize} stroke={stroke} strokeWidth={strokeWidth} absoluteStrokeWidth />
      </span>
      {showAccent && Accent && (
        <span className="sv-icon__accent" style={{ width: accentSize, height: accentSize }}>
          <Accent
            size={accentSize}
            stroke="var(--sv-icon-halo, #09090b)"
            strokeWidth={3.5}
            absoluteStrokeWidth
          />
          <Accent
            size={accentSize}
            stroke={accentColor}
            strokeWidth={2}
            absoluteStrokeWidth
          />
        </span>
      )}
    </span>
  );
}

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(" ");
}
