import type { SkillDimension } from "@/lib/insights/skills";

const CX = 200, CY = 200, R = 130;
const N = 6;

function angle(i: number) { return (i * 2 * Math.PI / N) - Math.PI / 2; }

function pt(i: number, scale: number): [number, number] {
  const a = angle(i);
  return [+(CX + scale * R * Math.cos(a)).toFixed(1) as unknown as number,
          +(CY + scale * R * Math.sin(a)).toFixed(1) as unknown as number];
}

function polygon(scales: number[]): string {
  return scales.map((s, i) => {
    const [x, y] = pt(i, Math.min(1, Math.max(0, s)));
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + " Z";
}

function labelAnchor(i: number): "middle" | "start" | "end" {
  const a = angle(i) % (2 * Math.PI);
  const deg = ((a * 180 / Math.PI) + 360) % 360;
  if (deg < 30 || deg > 330) return "middle";
  if (deg > 150 && deg < 210) return "middle";
  if (deg >= 30 && deg <= 150) return "start";
  return "end";
}

function labelBaseline(i: number): "auto" | "hanging" | "middle" {
  const a = angle(i);
  const deg = ((a * 180 / Math.PI) + 360) % 360;
  if (deg < 30 || deg > 330) return "auto";
  if (deg > 150 && deg < 210) return "hanging";
  return "middle";
}

export function SkillRadarChart({ skills }: { skills: SkillDimension[] }) {
  const gridPcts = [0.25, 0.5, 0.75, 1.0];
  const skillScales = skills.map((s) => s.score / 100);
  const labelDist = R + 26;

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-[380px]" aria-label="Skill radar chart">
      {gridPcts.map((pct) => (
        <path
          key={pct}
          d={polygon(Array(N).fill(pct))}
          fill="none"
          stroke="#3f3f46"
          strokeWidth={pct === 1 ? 1.5 : 1}
          strokeDasharray={pct === 1 ? undefined : "4 3"}
        />
      ))}

      {gridPcts.map((pct) => {
        const [x, y] = pt(0, pct);
        return (
          <text key={pct} x={x - 6} y={y + 1} fontSize="8" fill="#52525b" textAnchor="end" dominantBaseline="middle">
            {pct * 100}
          </text>
        );
      })}

      {Array.from({ length: N }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#3f3f46" strokeWidth="1" />;
      })}

      <path
        d={polygon(skillScales)}
        fill="rgba(34, 197, 94, 0.08)"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {skills.map((skill, i) => {
        const [x, y] = pt(i, skill.score / 100);
        return (
          <circle key={i} cx={x} cy={y} r="4" fill={skill.color} stroke="#09090b" strokeWidth="1.5" />
        );
      })}

      {skills.map((skill, i) => {
        const a = angle(i);
        const lx = +(CX + labelDist * Math.cos(a)).toFixed(1);
        const ly = +(CY + labelDist * Math.sin(a)).toFixed(1);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            fontSize="11"
            fontWeight="600"
            fill={skill.color}
            textAnchor={labelAnchor(i)}
            dominantBaseline={labelBaseline(i)}
          >
            {skill.label}
          </text>
        );
      })}
    </svg>
  );
}

export function SkillBreakdownCards({ skills }: { skills: SkillDimension[] }) {
  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <div key={skill.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-zinc-200">{skill.label}</p>
            <span className="text-lg font-black tabular-nums" style={{ color: skill.color }}>
              {skill.score}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 mb-1.5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${skill.score}%`, backgroundColor: skill.color }}
            />
          </div>
          <p className="text-[10px] text-zinc-600">{skill.note}</p>
        </div>
      ))}
    </div>
  );
}
