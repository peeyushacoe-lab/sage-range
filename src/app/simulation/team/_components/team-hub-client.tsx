"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-bold text-white mb-1">Create Team Room</h2>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Select a scenario, create a room, and share the code with your team.
        </p>

        <label className="block mb-1 text-xs uppercase tracking-wider text-zinc-500">
          Scenario
        </label>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full mb-4 rounded border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-sage-500/60"
        >
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>

        {createError && (
          <p className="mb-3 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
            {createError}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-sage-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? "Creating room..." : "Create Room →"}
        </button>
      </div>

      {/* Join a Room */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-bold text-white mb-1">Join a Room</h2>
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Enter the 6-character code shared by your IR Lead.
        </p>

        <label className="block mb-1 text-xs uppercase tracking-wider text-zinc-500">
          Room Code
        </label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="e.g. AB12CD"
          className="w-full mb-4 rounded border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white font-mono uppercase tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60"
        />

        {joinError && (
          <p className="mb-3 text-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded px-3 py-2">
            {joinError}
          </p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining || joinCode.trim().length !== 6}
          className="w-full rounded-lg border border-sage-500/40 px-4 py-2.5 text-sm font-bold text-sage-400 hover:bg-sage-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {joining ? "Joining..." : "Join Room →"}
        </button>
      </div>

      {/* Role overview */}
      <div className="sm:col-span-2 rounded-xl border border-white/8 bg-zinc-900/20 p-5">
        <p className="text-xs uppercase tracking-widest text-zinc-600 font-semibold mb-3">Team Roles</p>
        <div className="grid sm:grid-cols-4 gap-3">
          {[
            { role: "IR_LEAD", label: "IR Lead", icon: "🎯", desc: "Command decisions", color: "bg-sage-500/10 text-sage-400 border-sage-500/30" },
            { role: "FORENSICS", label: "Forensics", icon: "🔬", desc: "Collect evidence", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
            { role: "LEGAL", label: "Legal", icon: "⚖️", desc: "Manage disclosure", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
            { role: "COMMS", label: "Comms", icon: "📢", desc: "Handle communications", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
          ].map((r) => (
            <div key={r.role} className={`rounded-lg border px-3 py-2.5 ${r.color}`}>
              <p className="text-base mb-0.5">{r.icon} <span className="text-xs font-bold tracking-wider">{r.label}</span></p>
              <p className="text-[11px] opacity-70">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
