"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  type: "lab" | "path" | "scenario" | "user" | "writeup";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_ICON: Record<string, string> = {
  lab:      "🧪",
  path:     "🗺️",
  scenario: "🛡️",
  user:     "👤",
  writeup:  "📝",
};

const TYPE_LABEL: Record<string, string> = {
  lab:      "Lab",
  path:     "Learning Path",
  scenario: "Scenario",
  user:     "Profile",
  writeup:  "Writeup",
};

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Custom event from search trigger button
  useEffect(() => {
    function handler() { setOpen(true); }
    window.addEventListener("openSearch", handler);
    return () => window.removeEventListener("openSearch", handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); setResults([]); setSelected(0); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const d = await r.json();
        setResults(d.results ?? []);
        setSelected(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-zinc-900 border border-white/12 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search labs, paths, scenarios, people…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
          />
          {loading && <div className="w-3 h-3 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />}
          <kbd className="shrink-0 text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {/* Group by type */}
            {(["lab", "path", "scenario", "user", "writeup"] as const).map((type) => {
              const group = results.filter((r) => r.type === type);
              if (group.length === 0) return null;
              return (
                <div key={type} className="mb-1">
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {TYPE_LABEL[type]}
                  </p>
                  {group.map((result) => {
                    const idx = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          selected === idx ? "bg-white/6" : "hover:bg-white/3"
                        }`}
                      >
                        <span className="text-base leading-none shrink-0">{TYPE_ICON[type]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{result.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
                        </div>
                        {selected === idx && (
                          <kbd className="ml-auto shrink-0 text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">↵</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : query.trim().length >= 2 && !loading ? (
          <div className="py-10 text-center">
            <p className="text-zinc-600 text-sm">No results for "{query}"</p>
          </div>
        ) : query.trim().length < 2 ? (
          <div className="py-6 px-4 grid grid-cols-2 gap-2">
            {[
              { href: "/labs",           icon: "🧪", label: "Browse Labs" },
              { href: "/paths",          icon: "🗺️", label: "Learning Paths" },
              { href: "/simulation/new", icon: "🛡️", label: "Simulations" },
              { href: "/achievements",   icon: "🏅", label: "Achievements" },
            ].map((s) => (
              <button
                key={s.href}
                onClick={() => navigate(s.href)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/8 hover:border-white/15 hover:bg-white/3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors text-left"
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="border-t border-white/6 px-4 py-2 flex items-center gap-3 text-[10px] text-zinc-700">
          <span><kbd className="border border-zinc-700 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-zinc-700 rounded px-1">↵</kbd> open</span>
          <span><kbd className="border border-zinc-700 rounded px-1">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("openSearch"))}
      aria-label="Search"
      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors hidden sm:flex items-center gap-1.5"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <kbd className="text-[10px] border border-zinc-700 rounded px-1 py-0.5 hidden lg:inline">⌘K</kbd>
    </button>
  );
}
