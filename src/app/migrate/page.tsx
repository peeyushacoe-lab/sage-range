import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { MIGRATION_GRANT_MONTHS } from "@/lib/account-migration";
import { Navbar } from "@/components/navbar";
import { Card, Badge } from "@/components/ui";
import { MigrateForm } from "./_components/migrate-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Migrate your account · Sage Vault" };

export default async function MigratePage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  // Not a Nexus account — nothing to migrate. Send them somewhere useful
  // rather than showing a form that would just fail on submit.
  if (!user.externalId) redirect("/dashboard");

  const pending = await db.accountMigrationRequest.findFirst({
    where: { userId: user.id, completedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-lg px-6 py-14">
        <div className="mb-8 text-center">
          <Badge tone="blue" className="mb-4">Leaving Nexus?</Badge>
          <h1 className="text-3xl font-black tracking-tight">Migrate your account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Move your Sage Vault account to a personal email — you keep everything: labs, certificates,
            skill history, all of it. You&apos;ll sign in with Google going forward instead of Nexus.
          </p>
        </div>

        <Card className="mb-6 border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            + {MIGRATION_GRANT_MONTHS} months of free premium access, starting the moment you confirm
          </p>
        </Card>

        <Card className="p-6">
          <MigrateForm currentEmail={user.email} pendingEmail={pending?.newEmail ?? null} />
        </Card>
      </div>
    </main>
  );
}
