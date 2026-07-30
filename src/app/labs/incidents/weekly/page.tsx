import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

async function getCurrentCase() {
  try {
    const response = await fetch("/api/incidents/weekly", {
      cache: "no-store",
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.case;
  } catch (error) {
    console.error("Failed to fetch current weekly case:", error);
    return null;
  }
}

export default async function WeeklyIncidentsHub() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const currentCase = await getCurrentCase();

  if (currentCase) {
    redirect(`/labs/incidents/weekly/${currentCase.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/labs" backLabel="Labs" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Weekly Incidents"
          subtitle="New security incident cases release every Monday. Complete the investigation, evidence board, and report before Sunday 23:59 UTC to earn your certificate and claim a spot on the leaderboard."
        />

        <EmptyState
          icon="investigate"
          title="No active incident this week"
          description="The next weekly case will be released on Monday at 00:00 UTC. Check back soon to start investigating."
          action={{ label: "Explore Labs", href: "/labs" }}
        />
      </div>
    </main>
  );
}
