import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getSquadBySlug, getMembership } from "@/lib/squads";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SquadRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLE_TONE: Record<SquadRole, "amber" | "blue" | "zinc"> = {
  OWNER: "amber",
  OFFICER: "blue",
  MEMBER: "zinc",
};

export default async function SquadDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const squad = await getSquadBySlug(slug);
  if (!squad || squad.disbandedAt) notFound();

  const membership = await getMembership(user.id);
  const isMember = membership?.squadId === squad.id;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/squads" backLabel="Squads" />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title={`[${squad.tag}] ${squad.name}`}
          subtitle={squad.description ?? undefined}
          actions={
            isMember ? (
              <Badge tone={ROLE_TONE[membership.role]}>{membership.role}</Badge>
            ) : (
              <Badge tone={squad.joinPolicy === "OPEN" ? "emerald" : "zinc"}>
                {squad.joinPolicy === "OPEN" ? "Open to join" : "Invite only"}
              </Badge>
            )
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Members"
            value={squad._count.members}
            sub={`of ${squad.maxMembers}`}
          />
          <StatCard label="Join policy" value={squad.joinPolicy.replace("_", " ")} />
          <StatCard
            label="Formed"
            value={squad.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
        </div>

        <Card>
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Roster
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {squad.members.map((member) => {
              const isSelf = member.userId === user.id;
              return (
                <div
                  key={member.userId}
                  className={cn(
                    "flex items-center justify-between gap-4 px-5 py-3",
                    isSelf && "bg-emerald-500/5",
                  )}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${member.userId}`}
                      className="truncate font-medium hover:text-emerald-400"
                    >
                      {member.user.displayName || member.user.email}
                    </Link>
                    {isSelf && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-zinc-600">
                      joined{" "}
                      {member.joinedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <Badge tone={ROLE_TONE[member.role]}>{member.role}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}
