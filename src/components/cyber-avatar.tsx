import Image from "next/image";
import { getRankInfo } from "@/lib/cyber-identity";

const SIZES = {
  sm: { px: 36, strokeW: 7,   fontSize: 13 },
  md: { px: 48, strokeW: 6.5, fontSize: 17 },
  lg: { px: 80, strokeW: 5.5, fontSize: 28 },
};

const TIER_BG: Record<string, string> = {
  recruit: "rgba(39,39,42,0.9)",
  bronze:  "rgba(67,20,7,0.6)",
  silver:  "rgba(30,41,59,0.6)",
  gold:    "rgba(69,26,3,0.6)",
  elite:   "rgba(6,46,37,0.6)",
};

// Elite-only: static soft glow (no animation — just visual prestige)
const ELITE_FILTER = "drop-shadow(0 0 5px rgba(16,185,129,0.55)) drop-shadow(0 0 10px rgba(16,185,129,0.25))";

interface CyberAvatarProps {
  initial: string;
  skillScore: number;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  roleBadgeIcon?: string;
}

const R = 44;
const CIRC = 2 * Math.PI * R;

export function CyberAvatar({ initial, skillScore, avatarUrl, size = "md", roleBadgeIcon }: CyberAvatarProps) {
  const rank = getRankInfo(skillScore);
  const { px, strokeW, fontSize } = SIZES[size];
  const offset = CIRC * (1 - rank.pct / 100);
  const badgePx = Math.round(px * 0.3);
  const isElite = rank.tier === "elite";

  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      {/* Ring */}
      <svg
        viewBox="0 0 100 100"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          transform: "rotate(-90deg)",
          filter: isElite ? ELITE_FILTER : undefined,
        }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r={R} fill="none" stroke="#27272a" strokeWidth={strokeW} />
        <circle
          cx="50" cy="50" r={R} fill="none"
          stroke={rank.color}
          strokeWidth={strokeW}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      {/* Inner face — photo or initial fallback */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{ margin: `${Math.round(strokeW * px / 100) + 2}px` }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={initial}
            fill
            className="object-cover rounded-full"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center rounded-full font-black select-none"
            style={{ background: TIER_BG[rank.tier], color: rank.color, fontSize }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Role badge overlay — md/lg only */}
      {roleBadgeIcon && size !== "sm" && (
        <div
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800"
          style={{ width: badgePx, height: badgePx, fontSize: Math.round(badgePx * 0.6) }}
        >
          {roleBadgeIcon}
        </div>
      )}
    </div>
  );
}
