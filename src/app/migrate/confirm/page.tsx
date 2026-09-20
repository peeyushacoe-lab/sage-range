import { getMigrationRequestByToken } from "@/lib/account-migration";
import { MIGRATION_GRANT_MONTHS } from "@/lib/account-migration";
import { Card } from "@/components/ui";
import { ConfirmButton } from "./_components/confirm-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your email · Sage Vault" };

export default async function MigrateConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const request = token ? await getMigrationRequestByToken(token) : null;

  const invalid = !token || !request;
  const alreadyUsed = request?.completedAt;
  const expired = request && !request.completedAt && request.expiresAt < new Date();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <Card className="w-full max-w-md p-8 text-center">
        {invalid || alreadyUsed || expired ? (
          <>
            <p className="mb-2 text-3xl">⚠️</p>
            <h1 className="mb-2 text-lg font-bold text-zinc-100">
              {alreadyUsed ? "Already confirmed" : expired ? "Link expired" : "Invalid link"}
            </h1>
            <p className="text-sm text-zinc-400">
              {alreadyUsed
                ? "This migration link has already been used — your account should already be moved."
                : expired
                  ? "This link expired 24 hours after it was sent. Go back to your dashboard and start again."
                  : "This confirmation link isn't valid. Check that you copied the full link from the email."}
            </p>
          </>
        ) : (
          <>
            <p className="mb-2 text-3xl">✓</p>
            <h1 className="mb-2 text-lg font-bold text-zinc-100">Confirm your new email</h1>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Moving your Sage Vault account to <span className="font-semibold text-zinc-200">{request!.newEmail}</span>.
              You&apos;ll sign in with Google using this address from now on, with everything you&apos;ve already
              done still attached — plus {MIGRATION_GRANT_MONTHS} months of free premium access.
            </p>
            <ConfirmButton token={token!} />
          </>
        )}
      </Card>
    </main>
  );
}
