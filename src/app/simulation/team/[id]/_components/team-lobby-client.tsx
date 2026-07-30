"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";
type Member = {
  id: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  name: string;
  email: string;
};

type TeamData = {
  id: string;
  code: string;
  templateSlug: string;
  status: string;
  sessionId: string | null;
  leadId: string;
  members: Member[];
};

type Props = {
  teamId: string;
  currentUserId: string;
  initialData: TeamData;
};

const TEMPLATE_NAMES: Record<string, string> = {
  "phishing-to-ransomware": "Phishing to Ransomware",
  "insider-threat": "Insider Threat: The Disgruntled Admin",
};

const ROLES = [
  { value: "FORENSICS", label: "Forensics", icon: "forensics", desc: "Collect evidence", color: "bg-info-wash text-info border-info-edge" },
  { value: "LEGAL", label: "Legal", icon: "balance", desc: "Manage disclosure", color: "bg-accent-wash text-accent border-accent-edge" },
  { value: "COMMS", label: "Comms", icon: "announce", desc: "Handle communications", color: "bg-warn-wash text-warn border-warn-edge" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  IR_LEAD:   "bg-ok-wash text-ok border-ok-edge",
  FORENSICS: "bg-info-wash text-info border-info-edge",
  LEGAL:     "bg-accent-wash text-accent border-accent-edge",
  COMMS:     "bg-warn-wash text-warn border-warn-edge",
};

const ROLE_LABELS: Record<string, string> = {
  IR_LEAD: "IR Lead",
  FORENSICS: "Forensics",
  LEGAL: "Legal",
  COMMS: "Comms",
};

export function TeamLobbyClient({ teamId, currentUserId, initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState<TeamData>(initialData);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/${teamId}`);
      if (!res.ok) return;
      const json = await res.json() as TeamData;
      setData(json);
      // If launched, redirect to ops room
      if (json.status === "ACTIVE") {
        router.push(`/simulation/team/${teamId}/ops`);
      }
    } catch { /* silent */ }
  }, [teamId, router]);

  useEffect(() => {
    if (data.status !== "LOBBY") return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh, data.status]);

  const myMember = data.members.find((m) => m.userId === currentUserId);
  const isLead = data.leadId === currentUserId;
  const takenRoles = new Set(data.members.map((m) => m.role).filter(Boolean));
  const allHaveRoles = data.members.length >= 2 && data.members.every((m) => m.role !== null);

  async function selectRole(role: string) {
    setRoleError(null);
    try {
      const res = await fetch(`/api/team/${teamId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        const msg =
          json.error === "role_taken" ? "That role is already taken." :
          json.error === "role_reserved" ? "IR Lead is reserved for the room creator." :
          "Failed to select role.";
        setRoleError(msg);
        return;
      }
      await refresh();
    } catch {
      setRoleError("Network error.");
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch(`/api/team/${teamId}/launch`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        const msg =
          json.error === "need_at_least_2_members" ? "Need at least 2 members to launch." :
          json.error === "not_all_roles_assigned" ? "All members must pick a role before launching." :
          "Failed to launch simulation.";
        setLaunchError(msg);
        return;
      }
      router.push(`/simulation/team/${teamId}/ops`);
    } catch {
      setLaunchError("Network error.");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-0 px-6 py-10 max-w-2xl mx-auto">
      <Link href="/simulation/team" className="text-xs text-ink-3 hover:text-ink-2 transition tracking-wide">
        ← Back
      </Link>

      <div className="mt-8 mb-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-1">Team Lobby</p>
        <h1 className="text-2xl font-bold text-white">
          {TEMPLATE_NAMES[data.templateSlug] ?? data.templateSlug}
        </h1>
      </div>

      {/* Room code */}
      <div className="rounded-xl border border-ok-edge bg-ok-wash p-5 mb-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-2">
          Share this code with your team
        </p>
        <p className="text-4xl font-mono font-bold tracking-[0.3em] text-white">
          {data.code}
        </p>
      </div>

      {/* Member list */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-3">
          Team Members ({data.members.length}/4)
        </p>
        <div className="space-y-2">
          {data.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-edge bg-surface-1 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-ink-3">{m.email}</p>
              </div>
              {m.role ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ROLE_COLORS[m.role] ?? "text-ink-2 border-edge-strong"}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              ) : (
                <span className="text-xs text-ink-3 italic">No role yet</span>
              )}
            </div>
          ))}
          {Array.from({ length: 4 - data.members.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center rounded-lg border border-dashed border-edge-subtle px-4 py-3"
            >
              <p className="text-xs text-ink-3 italic">Waiting for player...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Role selector for non-leads who don't have a role yet */}
      {!isLead && myMember && !myMember.role && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-3">
            Choose Your Role
          </p>
          {roleError && (
            <p className="mb-3 text-xs text-danger border border-danger-edge bg-danger-wash rounded px-3 py-2">
              {roleError}
            </p>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            {ROLES.map((r) => {
              const taken = takenRoles.has(r.value);
              return (
                <button
                  key={r.value}
                  onClick={() => !taken && selectRole(r.value)}
                  disabled={taken}
                  className={`rounded-lg border px-3 py-3 text-left transition ${r.color} ${taken ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"}`}
                >
                  <p className="mb-0.5 flex items-center gap-1.5"><Icon name={r.icon} size={16} /><span className="text-xs font-bold">{r.label}</span></p>
                  <p className="text-[11px] opacity-70">{taken ? "Taken" : r.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* IR Lead launch controls */}
      {isLead && (
        <div className="rounded-xl border border-edge bg-surface-1 p-5">
          {launchError && (
            <p className="mb-3 text-xs text-danger border border-danger-edge bg-danger-wash rounded px-3 py-2">
              {launchError}
            </p>
          )}
          <button
            onClick={handleLaunch}
            disabled={launching || !allHaveRoles}
            className="w-full rounded-lg bg-accent-fill px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {launching ? "Launching simulation..." : "Launch Simulation →"}
          </button>
          {!allHaveRoles && (
            <p className="mt-2 text-xs text-ink-3 text-center">
              {data.members.length < 2
                ? "Wait for at least one more player to join."
                : "All members must select a role before you can launch."}
            </p>
          )}
        </div>
      )}

      {/* Non-lead waiting message */}
      {!isLead && (
        <div className="rounded-xl border border-edge bg-surface-1 p-5 text-center">
          <p className="text-sm text-ink-2">Waiting for IR Lead to launch the simulation...</p>
          <p className="text-xs text-ink-3 mt-1">This page polls automatically every 3 seconds.</p>
        </div>
      )}
    </main>
  );
}
