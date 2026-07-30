import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TeamHubClient } from "./_components/team-hub-client";
import { Navbar } from "@/components/navbar";

const TEMPLATES = [
  { slug: "phishing-to-ransomware", name: "Phishing to Ransomware" },
  { slug: "insider-threat", name: "Insider Threat: The Disgruntled Admin" },
];

export default async function TeamHubPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="px-6 py-10 max-w-3xl mx-auto">

      <div className="mt-8 mb-8">
        <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-2">Multiplayer</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Team IR Exercise</h1>
        <p className="text-zinc-400 mt-2 text-sm max-w-xl leading-relaxed">
          Run a live incident response exercise with your team. Each analyst takes a distinct role — IR Lead, Forensics, Legal, or Comms — and must coordinate to contain the breach.
        </p>
      </div>

      <TeamHubClient templates={TEMPLATES} />
      </div>
    </main>
  );
}
