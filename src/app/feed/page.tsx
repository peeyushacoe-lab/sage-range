import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getActivityFeed, getFeedReactions, serializeFeed } from "@/lib/activity-feed";
import { Navbar } from "@/components/navbar";
import { FeedCard } from "./_components/feed-card";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const feed = await getActivityFeed({ limit: 60 });
  const entryIds = feed.map((e) => e.id);
  const { counts, mine } = await getFeedReactions(entryIds, me.id);
  const serialized = serializeFeed(feed);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Community Feed</h1>
            <p className="text-zinc-500 text-sm mt-1">Verified cybersecurity activity across the platform</p>
          </div>
          <Link
            href={`/profile/${me.id}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-white/8 rounded-lg px-3 py-2 transition-colors"
          >
            My Profile →
          </Link>
        </div>

        {serialized.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-500 text-sm">No activity yet.</p>
            <p className="text-zinc-700 text-xs mt-1">Complete a lab or simulation to appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serialized.map((entry) => (
              <FeedCard
                key={entry.id}
                entry={entry}
                initialCounts={counts[entry.id] ?? {}}
                initialMine={mine[entry.id] ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
