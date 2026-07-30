import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PageHeader, EmptyState } from "@/components/ui";
import { HuntCard } from "./_components/hunt-card";

export const dynamic = "force-dynamic";

interface Dataset {
  id: string;
  name: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category: "Sysmon" | "Apache" | "Network" | "Windows" | "Linux" | "Cloud";
  logCount: number;
  expectedArtifacts: number;
}

async function getDatasets(): Promise<Dataset[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/hunts/datasets`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HuntDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; category?: string; search?: string }>;
}) {
  const { difficulty, category, search } = await searchParams;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const datasets = await getDatasets();

  // Filter datasets
  let filtered = datasets;
  if (difficulty) {
    filtered = filtered.filter((d) => d.difficulty === difficulty);
  }
  if (category) {
    filtered = filtered.filter((d) => d.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((d) => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
  }

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Threat Hunt Sandbox"
          subtitle="Discover and participate in guided threat hunts across diverse datasets. Identify indicators of compromise, validate detection logic, and compete on the leaderboard."
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-ink-3">Difficulty:</span>
            {["EASY", "MEDIUM", "HARD"].map((d) => (
              <Link
                key={d}
                href={`/labs/hunts${difficulty === d ? "" : `?difficulty=${d}`}`}
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  difficulty === d
                    ? "bg-ok-wash border-ok-edge text-ok"
                    : "border-edge text-ink-2 hover:text-white"
                }`}
              >
                {d}
              </Link>
            ))}
            {difficulty && (
              <Link href="/labs/hunts" className="text-xs text-ink-3 hover:text-ink-2">
                Clear
              </Link>
            )}
          </div>
        </div>

        {/* Hunt Cards Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((hunt) => (
              <HuntCard key={hunt.id} hunt={hunt} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="investigate"
            title="No hunts found"
            description="Try adjusting your filters or check back later for new datasets."
          />
        )}
      </div>
    </main>
  );
}
