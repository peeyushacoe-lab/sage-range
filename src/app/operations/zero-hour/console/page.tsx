import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRunState } from "@/lib/ozh";
import { Console } from "./_components/console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zero Hour Console · Sage Vault" };

/**
 * The console shell.
 *
 * Deliberately thin: it establishes that a live run exists and hands off. All
 * phase content is fetched per-phase from the API rather than passed down
 * here, so a page source view during Phase 1 cannot reveal Phase 3.
 */
export default async function ConsolePage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const state = await getRunState(user.id);
  if (!state) redirect("/operations/zero-hour");
  if (state.status !== "IN_PROGRESS" || state.secondsRemaining === 0) {
    redirect("/operations/zero-hour/result");
  }

  return (
    <Console
      initialSecondsRemaining={state.secondsRemaining}
      initialPhase={state.currentPhase}
      completedPhases={state.completedPhases.map((p) => p.phase)}
    />
  );
}
