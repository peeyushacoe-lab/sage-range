"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
type Template = { slug: string; name: string };

type Props = {
  templates: Template[];
};

export function TeamHubClient({ templates }: Props) {
  const router = useRouter();

  // Create form state
  const [selectedSlug, setSelectedSlug] = useState(templates[0]?.slug ?? "");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join form state
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: selectedSlug }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        setCreateError(json.error ?? "Failed to create room.");
        return;
      }
      const { id } = await res.json() as { id: string };
      router.push(`/simulation/team/${id}`);
    } catch {
      setCreateError("Network error. Is the server running?");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Enter a 6-character room code.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        const msg =
          json.error === "invalid_code" ? "Room not found. Check the code." :
          json.error === "team_full" ? "Room is full (max 4 players)." :
          json.error === "session_not_in_lobby" ? "This session has already started." :
          "Failed to join room.";
        setJoinError(msg);
        return;
      }
      const { teamSessionId } = await res.json() as { teamSessionId: string };
      router.push(`/simulation/team/${teamSessionId}`);
    } catch {
      setJoinError("Network error. Is the server running?");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {/* Create Team Room */}
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <h2 className="text-lg font-bold text-white mb-1">Create Team Room</h2>
        <p className="text-xs text-ink-3 mb-4 leading-relaxed">
          Select a scenario, create a room, and share the code with your team.
        </p>

        <label className="block mb-1 text-xs uppercase tracking-wider text-ink-3">
          Scenario
        </label>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full mb-4 rounded border border-edge bg-surface-2 px-3 py-2 text-sm text-white focus:outline-none focus:border-ok-edge"
        >
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>

        {createError && (
          <p className="mb-3 text-xs text-danger border border-danger-edge bg-danger-wash rounded px-3 py-2">
            {createError}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg bg-accent-fill px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "Creating room..." : "Create Room →"}
        </button>
      </div>

      {/* Join a Room */}
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <h2 className="text-lg font-bold text-white mb-1">Join a Room</h2>
        <p className="text-xs text-ink-3 mb-4 leading-relaxed">
          Enter the 6-character code shared by your IR Lead.
        </p>

        <label className="block mb-1 text-xs uppercase tracking-wider text-ink-3">
          Room Code
        </label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="e.g. AB12CD"
          className="w-full mb-4 rounded border border-edge bg-surface-2 px-3 py-2 text-sm text-white font-mono uppercase tracking-widest placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
        />

        {joinError && (
          <p className="mb-3 text-xs text-danger border border-danger-edge bg-danger-wash rounded px-3 py-2">
            {joinError}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining || joinCode.trim().length !== 6}
          className="w-full rounded-lg border border-ok-edge px-4 py-2.5 text-sm font-bold text-ok hover:bg-ok-wash disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {joining ? "Joining..." : "Join Room →"}
        </button>
      </div>

      {/* Role overview */}
      <div className="sm:col-span-2 rounded-xl border border-edge bg-surface-1 p-5">
        <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-3">Team Roles</p>
        <div className="grid sm:grid-cols-4 gap-3">
          {([
            { role: "IR_LEAD", label: "IR Lead", icon: "simulations", desc: "Command decisions", color: "bg-ok-wash text-ok border-ok-edge" },
            { role: "FORENSICS", label: "Forensics", icon: "forensics", desc: "Collect evidence", color: "bg-info-wash text-info border-info-edge" },
            { role: "LEGAL", label: "Legal", icon: "balance", desc: "Manage disclosure", color: "bg-accent-wash text-accent border-accent-edge" },
            { role: "COMMS", label: "Comms", icon: "announce", desc: "Handle communications", color: "bg-warn-wash text-warn border-warn-edge" },
          ] as const).map((r) => (
            <div key={r.role} className={`rounded-lg border px-3 py-2.5 ${r.color}`}>
              <p className="mb-0.5 flex items-center gap-1.5"><Icon name={r.icon} size={16} /><span className="text-xs font-bold tracking-wider">{r.label}</span></p>
              <p className="text-[11px] opacity-70">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
