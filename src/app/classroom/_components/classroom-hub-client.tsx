"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function CreateClassroomClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, webhookUrl: webhookUrl.trim() || undefined }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      router.push(`/classroom/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-sm">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Class name (e.g. CS401 Fall 2026)"
          className="flex-1 rounded-lg bg-surface-1 border border-edge px-3 py-2 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white disabled:opacity-40 transition"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
      <input
        value={webhookUrl}
        onChange={(e) => setWebhookUrl(e.target.value)}
        placeholder="https://canvas.youruniversity.edu/api/v1/... (optional)"
        className="rounded-lg bg-surface-1 border border-edge px-3 py-2 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </form>
  );
}

export function JoinClassroomClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("join");
    if (param) setCode(param.toUpperCase());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Invalid code"); return; }
      router.push(`/classroom/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter join code (e.g. XK92A1)"
        maxLength={6}
        className="flex-1 rounded-lg bg-surface-1 border border-edge px-3 py-2 text-sm font-mono text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge uppercase tracking-widest"
      />
      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white disabled:opacity-40 transition"
      >
        {loading ? "Joining…" : "Join"}
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </form>
  );
}
