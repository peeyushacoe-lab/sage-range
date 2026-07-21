import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { IrWorkspace } from "./_components/ir-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "IR Workspace — Meridian Capital · Sage Vault" };

export default async function WorkspacePage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <Navbar />
      <IrWorkspace />
    </div>
  );
}
