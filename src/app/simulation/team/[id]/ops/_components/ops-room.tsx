"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
type Member = { userId: string; role: string | null; name: string };
type Note = { id: string; content: string; authorName: string; createdAt: string };
type Evidence = { id: string; title: string; content: string; tag: string; pinnedByName: string; createdAt: string };
type Task = { id: string; title: string; assignedRole: string | null; done: boolean; createdByName: string; createdAt: string };
type SimEvent = { type: string; actor: string; narrative: string | null; createdAt: string };

type OpsData = {
  id: string;
  code: string;
  templateSlug: string;
  status: string;
  sessionId: string | null;
  leadId: string;
  members: Member[];
  notes: Note[];
  evidence: Evidence[];
  tasks: Task[];
  simEvents: SimEvent[];
};

const ROLE_COLORS: Record<string, string> = {
  IR_LEAD:   "bg-ok-wash text-ok border-ok-edge",
  FORENSICS: "bg-info-wash text-info border-info-edge",
  LEGAL:     "bg-accent-wash text-accent border-accent-edge",
  COMMS:     "bg-warn-wash text-warn border-warn-edge",
};

const TAG_COLORS: Record<string, string> = {
  INDICATOR: "border-danger-edge bg-danger-wash text-danger",
  TIMELINE:  "border-info-edge bg-info-wash text-info",
  AFFECTED:  "border-sev-high-edge bg-sev-high-wash text-sev-high",
  IOC:       "border-accent-edge bg-accent-wash text-accent",
  ACTION:    "border-ok-edge bg-ok-wash text-ok",
};

const EVENT_TYPES_HIDDEN = new Set(["SESSION_STARTED"]);

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

type Tab = "timeline" | "evidence" | "notes" | "tasks";

export function OpsRoom({
  teamId,
  currentUserId,
  currentRole,
  initialData,
}: {
  teamId: string;
  currentUserId: string;
  currentRole: string | null;
  initialData: OpsData;
}) {
  const [data, setData] = useState<OpsData>(initialData);
  const [tab, setTab] = useState<Tab>("timeline");

  // Notes state
  const [noteInput, setNoteInput] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Evidence state
  const [evTitle, setEvTitle] = useState("");
  const [evContent, setEvContent] = useState("");
  const [evTag, setEvTag] = useState<string>("INDICATOR");
  const [evLoading, setEvLoading] = useState(false);
  const [showEvForm, setShowEvForm] = useState(false);

  // Task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRole, setTaskRole] = useState<string>("");
  const [taskLoading, setTaskLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/${teamId}/ops`);
      if (!res.ok) return;
      const json = await res.json() as OpsData;
      setData(json);
    } catch { /* silent */ }
  }, [teamId]);

  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  // Auto-scroll timeline
  useEffect(() => {
    if (tab === "timeline" && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [data.simEvents, tab]);

  async function postNote() {
    if (!noteInput.trim()) return;
    setNoteLoading(true);
    try {
      const res = await fetch(`/api/team/${teamId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteInput }),
      });
      if (res.ok) {
        setNoteInput("");
        await refresh();
      }
    } finally {
      setNoteLoading(false);
    }
  }

  async function pinEvidence() {
    if (!evTitle.trim() || !evContent.trim()) return;
    setEvLoading(true);
    try {
      const res = await fetch(`/api/team/${teamId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: evTitle, content: evContent, tag: evTag }),
      });
      if (res.ok) {
        setEvTitle(""); setEvContent(""); setEvTag("INDICATOR"); setShowEvForm(false);
        await refresh();
      }
    } finally {
      setEvLoading(false);
    }
  }

  async function removeEvidence(evidenceId: string) {
    await fetch(`/api/team/${teamId}/evidence`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId }),
    });
    await refresh();
  }

  async function createTask() {
    if (!taskTitle.trim()) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`/api/team/${teamId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, assignedRole: taskRole || undefined }),
      });
      if (res.ok) {
        setTaskTitle(""); setTaskRole(""); setShowTaskForm(false);
        await refresh();
      }
    } finally {
      setTaskLoading(false);
    }
  }

  async function toggleTask(taskId: string, done: boolean) {
    await fetch(`/api/team/${teamId}/tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, done }),
    });
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, done } : t),
    }));
  }

  const visibleEvents = data.simEvents.filter(
    (e) => !EVENT_TYPES_HIDDEN.has(e.type) && e.narrative
  );

  const openTasks = data.tasks.filter((t) => !t.done);
  const doneTasks = data.tasks.filter((t) => t.done);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "timeline", label: "Timeline", count: visibleEvents.length },
    { key: "evidence", label: "Evidence Board", count: data.evidence.length },
    { key: "notes",    label: "Team Notes", count: data.notes.length },
    { key: "tasks",    label: "Task Board", count: openTasks.length },
  ];

  return (
    <div className="min-h-screen bg-surface-0 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-edge bg-surface-1 px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/simulation/team" className="text-xs text-ink-3 hover:text-ink-2 transition shrink-0">←</Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold">Operations Room</p>
            <h1 className="text-sm font-bold leading-tight truncate">{data.templateSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h1>
          </div>
        </div>

        {/* Members */}
        <div className="flex flex-wrap gap-2 ml-auto">
          {data.members.map((m) => (
            <div
              key={m.userId}
              className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-medium ${
                m.userId === currentUserId ? ROLE_COLORS[m.role ?? ""] ?? "border-edge-strong text-ink-2" : "border-edge text-ink-3"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${m.userId === currentUserId ? "bg-ok" : "bg-surface-3"}`} />
              {m.name.split(" ")[0]}
              {m.role && <span className="opacity-70">· {m.role.replace("_", " ")}</span>}
            </div>
          ))}
          {data.sessionId && (
            <Link
              href={`/simulation/${data.sessionId}`}
              className="inline-flex items-center gap-1 border border-ok-edge bg-ok-wash text-ok rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-ok-wash transition"
            >
              <Icon name="energy" size={14} className="inline-block" /> Live Sim →
            </Link>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="border-b border-edge px-6 flex gap-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-ok-edge text-ok"
                : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-2 text-[10px] bg-surface-2 rounded-full px-1.5 py-0.5 text-ink-2">
                {t.count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-2">
          <span className="text-[10px] text-ink-3 font-mono">↻ 5s</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* Incident Timeline */}
        {tab === "timeline" && (
          <div ref={timelineRef} className="h-full overflow-y-auto p-6 space-y-2">
            {visibleEvents.length === 0 ? (
              <div className="text-center py-16 text-ink-3">
                <p className="text-3xl mb-3">⏳</p>
                <p className="text-sm">Waiting for simulation events…</p>
                {!data.sessionId && <p className="text-xs mt-1">Simulation has not launched yet.</p>}
              </div>
            ) : (
              visibleEvents.map((e, i) => {
                const isAdversary = e.actor === "ADVERSARY" || e.type.startsWith("REDAI");
                const isStudent = e.actor === "ANALYST";
                const isTelemetry = e.type === "TELEMETRY_ALERT";
                return (
                  <div
                    key={i}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      isAdversary
                        ? "border-danger-edge bg-danger-wash"
                        : isTelemetry
                        ? "border-warn-edge bg-warn-wash"
                        : isStudent
                        ? "border-ok-edge bg-ok-wash"
                        : "border-edge-subtle bg-surface-1"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className={`leading-snug flex-1 ${isAdversary ? "text-danger" : isTelemetry ? "text-warn" : isStudent ? "text-ok" : "text-ink-2"}`}>
                        {e.narrative}
                      </p>
                      <span className="text-[10px] text-ink-3 shrink-0 mt-0.5">{timeAgo(e.createdAt)}</span>
                    </div>
                    <p className="text-[10px] text-ink-3 mt-1">{e.actor} · {e.type}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Evidence Board */}
        {tab === "evidence" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-ink-3">{data.evidence.length} item{data.evidence.length !== 1 ? "s" : ""} pinned</p>
              <button
                onClick={() => setShowEvForm((v) => !v)}
                className="text-xs rounded-lg border border-edge px-3 py-1.5 text-ink-2 hover:text-white hover:border-edge-strong transition"
              >
                + Pin Evidence
              </button>
            </div>

            {showEvForm && (
              <div className="rounded-xl border border-edge bg-surface-1 p-4 mb-5 space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-ink-3 block mb-1">Title</label>
                  <input
                    value={evTitle} onChange={(e) => setEvTitle(e.target.value)}
                    className="w-full bg-surface-0 border border-edge rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
                    placeholder="e.g. Suspicious login from 192.168.1.100"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-ink-3 block mb-1">Details</label>
                  <textarea
                    value={evContent} onChange={(e) => setEvContent(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-0 border border-edge rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge resize-none"
                    placeholder="Additional context..."
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-ink-3 block mb-1">Tag</label>
                  <div className="flex flex-wrap gap-2">
                    {(["INDICATOR", "TIMELINE", "AFFECTED", "IOC", "ACTION"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setEvTag(t)}
                        className={`text-[10px] font-bold border rounded-full px-2.5 py-0.5 transition ${evTag === t ? TAG_COLORS[t] : "border-edge text-ink-3 hover:text-ink-2"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={pinEvidence} disabled={evLoading || !evTitle.trim()}
                    className="text-xs px-4 py-1.5 rounded-lg bg-accent-fill text-white font-semibold hover:bg-accent-hover disabled:opacity-50 transition"
                  >
                    {evLoading ? "Pinning…" : "Pin to Board"}
                  </button>
                  <button onClick={() => setShowEvForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-edge text-ink-3 hover:text-white transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {data.evidence.length === 0 && !showEvForm ? (
              <div className="text-center py-16 text-ink-3">
                <p className="mb-3 flex justify-center"><Icon name="clipboard" size={32} /></p>
                <p className="text-sm">No evidence pinned yet.</p>
                <p className="text-xs mt-1">Pin indicators, IOCs, and affected systems from the timeline.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.evidence.map((e) => (
                  <div key={e.id} className={`rounded-xl border p-4 ${TAG_COLORS[e.tag] ?? "border-edge text-ink-2"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${TAG_COLORS[e.tag]}`}>{e.tag}</span>
                      <button
                        onClick={() => removeEvidence(e.id)}
                        className="text-ink-3 hover:text-danger transition text-xs"
                        title="Remove"
                      >×</button>
                    </div>
                    <p className="text-sm font-semibold text-ink mb-1">{e.title}</p>
                    <p className="text-xs text-ink-2 leading-relaxed">{e.content}</p>
                    <p className="text-[10px] text-ink-3 mt-2">{e.pinnedByName} · {timeAgo(e.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Notes */}
        {tab === "notes" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {data.notes.length === 0 ? (
                <div className="text-center py-16 text-ink-3">
                  <p className="mb-3 flex justify-center"><Icon name="note" size={32} /></p>
                  <p className="text-sm">No notes yet. Share findings with your team.</p>
                </div>
              ) : (
                data.notes.map((n) => (
                  <div key={n.id} className="rounded-lg border border-edge-subtle bg-surface-1 px-4 py-3">
                    <p className="text-sm text-ink leading-relaxed">{n.content}</p>
                    <p className="text-[10px] text-ink-3 mt-1.5">
                      <span className="text-ink-3 font-medium">{n.authorName}</span> · {timeAgo(n.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-edge p-4 flex gap-3">
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postNote(); } }}
                className="flex-1 bg-surface-1 border border-edge rounded-lg px-4 py-2.5 text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ok-edge"
                placeholder="Post a note to your team… (Enter to send)"
              />
              <button
                onClick={postNote}
                disabled={noteLoading || !noteInput.trim()}
                className="px-4 py-2.5 rounded-lg bg-accent-fill text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 transition"
              >
                {noteLoading ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* Task Board */}
        {tab === "tasks" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs text-ink-3">{openTasks.length} open · {doneTasks.length} done</p>
              <button
                onClick={() => setShowTaskForm((v) => !v)}
                className="text-xs rounded-lg border border-edge px-3 py-1.5 text-ink-2 hover:text-white hover:border-edge-strong transition"
              >
                + Add Task
              </button>
            </div>

            {showTaskForm && (
              <div className="rounded-xl border border-edge bg-surface-1 p-4 mb-5 space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-ink-3 block mb-1">Task</label>
                  <input
                    value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-surface-0 border border-edge rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
                    placeholder="e.g. Isolate endpoint 192.168.1.100"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-ink-3 block mb-1">Assign to Role (optional)</label>
                  <select
                    value={taskRole} onChange={(e) => setTaskRole(e.target.value)}
                    className="w-full bg-surface-0 border border-edge rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
                  >
                    <option value="">Unassigned</option>
                    <option value="IR_LEAD">IR Lead</option>
                    <option value="FORENSICS">Forensics</option>
                    <option value="LEGAL">Legal</option>
                    <option value="COMMS">Comms</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={createTask} disabled={taskLoading || !taskTitle.trim()}
                    className="text-xs px-4 py-1.5 rounded-lg bg-accent-fill text-white font-semibold hover:bg-accent-hover disabled:opacity-50 transition"
                  >
                    {taskLoading ? "Creating…" : "Create Task"}
                  </button>
                  <button onClick={() => setShowTaskForm(false)} className="text-xs px-3 py-1.5 rounded-lg border border-edge text-ink-3 hover:text-white transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {openTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded-lg border border-edge bg-surface-1 px-4 py-3 group">
                  <button
                    onClick={() => toggleTask(t.id, true)}
                    className="mt-0.5 w-4 h-4 rounded border border-edge-strong hover:border-ok-edge hover:bg-ok-wash transition shrink-0"
                    title="Mark done"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {t.assignedRole && (
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${ROLE_COLORS[t.assignedRole] ?? "border-edge-strong text-ink-3"}`}>
                          {t.assignedRole.replace("_", " ")}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-3">{t.createdByName} · {timeAgo(t.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {doneTasks.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-ink-3 pt-3 pb-1">Completed</p>
                  {doneTasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 rounded-lg border border-edge-subtle bg-surface-1 px-4 py-3 opacity-50">
                      <button
                        onClick={() => toggleTask(t.id, false)}
                        className="mt-0.5 w-4 h-4 rounded border border-ok-edge bg-ok-wash shrink-0"
                        title="Reopen"
                      >
                        <svg className="w-3 h-3 text-ok mx-auto" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <p className="text-sm text-ink-3 line-through">{t.title}</p>
                    </div>
                  ))}
                </>
              )}
              {data.tasks.length === 0 && !showTaskForm && (
                <div className="text-center py-16 text-ink-3">
                  <p className="text-3xl mb-3"><Icon name="checkCircle" size={14} className="inline-block shrink-0" /></p>
                  <p className="text-sm">No tasks yet. Add tasks and assign them to roles.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
