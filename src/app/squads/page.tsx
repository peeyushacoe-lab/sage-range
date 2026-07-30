import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listSquads, getMembership } from "@/lib/squads";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { PageHeader, EmptyState, Card, Badge, buttonVariants } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [squads, membership, pendingInvites] = await Promise.all([
    listSquads({ limit: 30 }),
    getMembership(user.id),
    db.squadInvite.count({
      where: { inviteeId: user.id, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Squads"
          subtitle="Standing teams that compete together across seasons and squad tournaments."
          actions={
            membership ? (
              <Link
                href={`/squads/${membership.squad.slug}`}
                className={cn(buttonVariants({ variant: "primary", size: "md" }), "shrink-0")}
              >
                My squad
              </Link>
            ) : undefined
          }
        />

        {pendingInvites > 0 && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3">
              <Icon name="bell" size={20} />
              <p className="text-sm">
                You have <span className="font-bold text-emerald-400">{pendingInvites}</span>{" "}
                pending squad {pendingInvites === 1 ? "invite" : "invites"}.
              </p>
            </div>
          </Card>
        )}

        {membership && (
          <Card className="mb-8 p-5">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
              Your squad
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/squads/${membership.squad.slug}`}
                className="text-lg font-bold hover:text-emerald-400"
              >
                <span className="text-zinc-500">[{membership.squad.tag}]</span>{" "}
                {membership.squad.name}
              </Link>
              <Badge tone={membership.role === "OWNER" ? "amber" : "zinc"}>
                {membership.role}
              </Badge>
            </div>
          </Card>
        )}

        {squads.length === 0 ? (
          <EmptyState
            icon="users"
            title="No squads yet"
            description="Be the first to form one and start climbing the squad ladder."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {squads.map((squad) => (
              <Card key={squad.id} className="flex flex-col gap-3 p-5" interactive>
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/squads/${squad.slug}`}
                    className="text-base font-semibold hover:text-emerald-400"
                  >
                    <span className="text-zinc-500">[{squad.tag}]</span> {squad.name}
                  </Link>
                  <Badge tone={squad.joinPolicy === "OPEN" ? "emerald" : "zinc"}>
                    {squad.joinPolicy === "OPEN" ? "Open" : "Invite"}
                  </Badge>
                </div>

                {squad.description && (
                  <p className="line-clamp-2 text-sm text-zinc-400">{squad.description}</p>
                )}

                <div className="mt-auto flex items-center gap-2 text-xs text-zinc-500">
                  <Icon name="users" size={14} />
                  {squad._count.members} / {squad.maxMembers} members
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
