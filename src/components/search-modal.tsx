"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, LoaderCircle } from "lucide-react";

import { Icon, type IconName } from "@/components/ui/icon";
type SearchResult = {
  type: "lab" | "path" | "course" | "incident" | "scenario" | "user" | "writeup";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_ICON: Record<string, IconName> = {
  lab:      "labs",
  path:     "recon",
  course:   "learning",
  incident: "investigate",
  scenario: "simulations",
  user:     "user",
  writeup:  "note",
};

const TYPE_LABEL: Record<string, string> = {
  lab:      "Lab",
  path:     "Learning Path",
  course:   "Academy Course",
  incident: "Incident Simulation",
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
      className="fixed inset-0 z-modal flex items-start justify-center px-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-edge bg-surface-2 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-edge-subtle px-4 py-3">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search labs, paths, scenarios, people…"
            className="flex-1 bg-transparent text-sm text-ink placeholder-ink-3 outline-none"
          />
          {loading && <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-3" />}
          <kbd className="shrink-0 rounded-sm border border-edge-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-3">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {/* Group by type */}
            {(["lab", "path", "course", "incident", "scenario", "user", "writeup"] as const).map((type) => {
              const group = results.filter((r) => r.type === type);
              if (group.length === 0) return null;
              return (
                <div key={type} className="mb-1">
                  <p className="px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
                    {TYPE_LABEL[type]}
                  </p>
                  {group.map((result) => {
                    const idx = results.indexOf(result);
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result.href)}
                        onMouseEnter={() => setSelected(idx)}
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast ${
                          selected === idx ? "bg-surface-3" : "hover:bg-surface-3/60"
                        }`}
                      >
                        <Icon name={TYPE_ICON[type]} size={16} className="shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{result.title}</p>
                          <p className="truncate text-xs text-ink-3">{result.subtitle}</p>
                        </div>
                        {selected === idx && (
                          <kbd className="ml-auto shrink-0 rounded-sm border border-edge-strong px-1.5 py-0.5 font-mono text-[10px] text-ink-3">↵</kbd>
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
            <p className="text-sm text-ink-3">No results for &quot;{query}&quot;</p>
          </div>
        ) : query.trim().length < 2 ? (
          <div className="grid grid-cols-2 gap-2 px-4 py-6">
            {[
              { href: "/academy",        icon: "learning" as IconName, label: "Academy" },
              { href: "/labs",           icon: "labs" as IconName, label: "Browse Labs" },
              { href: "/simulation/new", icon: "simulations" as IconName, label: "Simulations" },
              { href: "/achievements",   icon: "achievements" as IconName, label: "Achievements" },
            ].map((s) => (
              <button
                key={s.href}
                onClick={() => navigate(s.href)}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-edge px-3 py-2.5 text-left text-sm text-ink-2 transition-colors duration-fast hover:border-edge-strong hover:bg-surface-3/60 hover:text-ink"
              >
                <Icon name={s.icon} size={16} />
                {s.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 border-t border-edge-subtle px-4 py-2 font-mono text-[10px] text-ink-3">
          <span><kbd className="rounded-sm border border-edge-strong px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded-sm border border-edge-strong px-1">↵</kbd> open</span>
          <span><kbd className="rounded-sm border border-edge-strong px-1">⌘K</kbd> toggle</span>
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
      className="flex cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink-2"
    >
      <Search aria-hidden="true" className="h-4 w-4" />
      <kbd className="hidden rounded-sm border border-edge-strong px-1 py-0.5 font-mono text-[10px] lg:inline">⌘K</kbd>
    </button>
  );
}
