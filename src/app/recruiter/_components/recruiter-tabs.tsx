"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AssessmentTab } from "./assessment-tab";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SimGrade = "A" | "B" | "C" | "D" | "F";

export type StudentRow = {
  id: string;
  displayName: string | null;
  email: string;
  university: string | null;
  skillScore: number;
  linkedIn: string | null;
  github: string | null;
  labsSolved: number;
  bestSimScore: number;
  simGrade: SimGrade;
  simCount: number;
  aiRating: number | null;
  aiVerdict: string | null;
  completedPaths: string[];
};

export type JobPostingRow = {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: {
    minSimGrade?: string;
    minScore?: number;
    requiredPaths?: string[];
  };
  active: boolean;
  createdAt: string;
};

type Props = {
  students: StudentRow[];
  bookmarkedIds: string[];
  jobPostings: JobPostingRow[];
};

// ── Grade helpers ─────────────────────────────────────────────────────────────

const GRADE_ORDER: SimGrade[] = ["A", "B", "C", "D", "F"];

function gradeColor(grade: SimGrade): string {
  switch (grade) {
    case "A": return "text-sage-400";
    case "B": return "text-emerald-400";
    case "C": return "text-amber-400";
    case "D": return "text-orange-400";
    case "F": return "text-red-400";
  }
}


function gradeIndex(grade: SimGrade): number {
  return GRADE_ORDER.indexOf(grade);
}

// ── Candidate match count ─────────────────────────────────────────────────────

function countMatches(students: StudentRow[], req: JobPostingRow["requirements"]): number {
  return students.filter((s) => {
    if (req.minScore !== undefined && s.skillScore < req.minScore) return false;
    if (req.minSimGrade) {
      const needed = gradeIndex(req.minSimGrade as SimGrade);
      const has = gradeIndex(s.simGrade);
      if (has > needed) return false; // higher index = worse grade
    }
    if (req.requiredPaths && req.requiredPaths.length > 0) {
      const hasAll = req.requiredPaths.every((p) => s.completedPaths.includes(p));
      if (!hasAll) return false;
    }
    return true;
  }).length;
}

// ── Main component ────────────────────────────────────────────────────────────

export function RecruiterTabs({ students, bookmarkedIds, jobPostings }: Props) {
  const [tab, setTab] = useState<"candidates" | "assessments" | "postings">("candidates");
  const bookmarkedSet = new Set(bookmarkedIds);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/8">
        <TabButton active={tab === "candidates"} onClick={() => setTab("candidates")}>
          Find Candidates
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{students.length}</span>
        </TabButton>
        <TabButton active={tab === "assessments"} onClick={() => setTab("assessments")}>
          Simulation Assessments
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {students.filter((s) => s.bestSimScore > 0).length}
          </span>
        </TabButton>
        <TabButton active={tab === "postings"} onClick={() => setTab("postings")}>
          My Job Postings
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{jobPostings.length}</span>
        </TabButton>
      </div>

      {tab === "candidates" && (
        <CandidatesTab students={students} bookmarkedIds={bookmarkedSet} />
      )}
      {tab === "assessments" && <AssessmentTab students={students} />}
      {tab === "postings" && (
        <PostingsTab students={students} initialPostings={jobPostings} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-sage-500 text-sage-400"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Candidates tab ────────────────────────────────────────────────────────────

const PATH_OPTIONS = [
  { value: "", label: "Any path" },
  { value: "ctf-starter", label: "CTF Starter" },
  { value: "web-security-essentials", label: "Web Security Essentials" },
  { value: "soc-fundamentals", label: "SOC Fundamentals" },
];

const GRADE_OPTIONS = [
  { value: "", label: "Any grade" },
  { value: "A", label: "A (90+)" },
  { value: "B", label: "B (75+)" },
  { value: "C", label: "C (60+)" },
];

function CandidatesTab({
  students,
  bookmarkedIds,
}: {
  students: StudentRow[];
  bookmarkedIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState("");
  const [minGrade, setMinGrade] = useState("");
  const [pathFilter, setPathFilter] = useState("");
  const [localBookmarks, setLocalBookmarks] = useState<Set<string>>(new Set(bookmarkedIds));
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const scoreThreshold = minScore ? parseInt(minScore, 10) : 0;
    const gradeThreshold = minGrade ? gradeIndex(minGrade as SimGrade) : -1;

    return students.filter((s) => {
      if (q) {
        const name = (s.displayName ?? s.email.split("@")[0]).toLowerCase();
        const email = s.email.toLowerCase();
        const uni = (s.university ?? "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !uni.includes(q)) return false;
      }
      if (scoreThreshold > 0 && s.skillScore < scoreThreshold) return false;
      if (gradeThreshold >= 0) {
        const studentGradeIdx = gradeIndex(s.simGrade);
        if (s.bestSimScore === 0 || studentGradeIdx > gradeThreshold) return false;
      }
      if (pathFilter && !s.completedPaths.includes(pathFilter)) return false;
      return true;
    });
  }, [students, search, minScore, minGrade, pathFilter]);

  function clearFilters() {
    setSearch("");
    setMinScore("");
    setMinGrade("");
    setPathFilter("");
  }

  const hasFilters = search || minScore || minGrade || pathFilter;

  async function toggleBookmark(candidateId: string) {
    if (pendingId === candidateId) return;
    setPendingId(candidateId);

    // Optimistic update
    const wasBookmarked = localBookmarks.has(candidateId);
    setLocalBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });

    try {
      const res = await fetch("/api/recruiter/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      if (!res.ok) {
        // Revert on failure
        setLocalBookmarks((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(candidateId);
          else next.delete(candidateId);
          return next;
        });
      }
    } catch {
      // Revert on network error
      setLocalBookmarks((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(candidateId);
        else next.delete(candidateId);
        return next;
      });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search name, email, university..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-lg border border-white/8 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Min score"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          min={0}
          className="w-32 rounded-lg border border-white/8 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none"
        />
        <select
          value={minGrade}
          onChange={(e) => setMinGrade(e.target.value)}
          className="rounded-lg border border-white/8 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:border-sage-500/50 focus:outline-none"
        >
          {GRADE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-zinc-900">
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="rounded-lg border border-white/8 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 focus:border-sage-500/50 focus:outline-none"
        >
          {PATH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-zinc-900">
              {o.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-white/8 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Showing {filtered.length} of {students.length} candidates
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-zinc-500 text-xs uppercase tracking-wider">
              <th className="text-left p-4">Rank</th>
              <th className="text-left p-4">Candidate</th>
              <th className="text-left p-4">University</th>
              <th className="text-right p-4">Score</th>
              <th className="text-right p-4">Labs</th>
              <th className="text-center p-4">Sim Grade</th>
              <th className="text-right p-4">Sim Score</th>
              <th className="text-center p-4">AI Verdict</th>
              <th className="text-center p-4">Save</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-zinc-500">
                  No candidates match your filters.
                </td>
              </tr>
            )}
            {filtered.map((s, i) => {
              const isBookmarked = localBookmarks.has(s.id);
              const isLoading = pendingId === s.id;
              return (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    isBookmarked ? "bg-sage-500/5 hover:bg-sage-500/8" : "hover:bg-white/3"
                  }`}
                >
                  <td className="p-4 text-zinc-500">{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {s.displayName ?? s.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-zinc-500">{s.email}</p>
                        <div className="flex gap-2 mt-1">
                          {s.linkedIn && (
                            <a
                              href={s.linkedIn}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sage-500 hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                          {s.github && (
                            <a
                              href={s.github}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-sage-500 hover:underline"
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>
                      {isBookmarked && (
                        <span className="rounded-full bg-sage-500/15 px-2 py-0.5 text-xs font-medium text-sage-400">
                          Saved
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-400">{s.university ?? "—"}</td>
                  <td className="p-4 text-right font-semibold text-zinc-100">{s.skillScore}</td>
                  <td className="p-4 text-right text-zinc-400">{s.labsSolved}</td>
                  <td className="p-4 text-center">
                    {s.bestSimScore > 0 ? (
                      <span className={`text-sm font-bold ${gradeColor(s.simGrade)}`}>
                        {s.simGrade}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {s.bestSimScore > 0 ? (
                      <span className="font-semibold text-sage-400">
                        {s.bestSimScore}
                        <span className="text-zinc-600 font-normal text-xs"> · {s.simCount}x</span>
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {s.aiVerdict ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.aiVerdict === "Strong hire"
                            ? "bg-sage-500/20 text-sage-500"
                            : s.aiVerdict === "Potential hire"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {s.aiVerdict}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleBookmark(s.id)}
                      disabled={isLoading}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark candidate"}
                      className={`text-xl transition-all disabled:opacity-40 ${
                        isBookmarked
                          ? "text-sage-400 hover:text-zinc-400"
                          : "text-zinc-600 hover:text-sage-400"
                      }`}
                    >
                      {isBookmarked ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/profile/${s.id}`}
                      className="text-xs text-sage-500 hover:underline whitespace-nowrap"
                    >
                      View profile →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Postings tab ──────────────────────────────────────────────────────────────

const GRADE_REQ_OPTIONS = [
  { value: "", label: "Any" },
  { value: "A", label: "A (90+)" },
  { value: "B", label: "B (75+)" },
  { value: "C", label: "C (60+)" },
];

const PATH_CHECKBOXES = [
  { value: "ctf-starter", label: "CTF Starter" },
  { value: "web-security-essentials", label: "Web Security Essentials" },
  { value: "soc-fundamentals", label: "SOC Fundamentals" },
];

type FormState = {
  title: string;
  company: string;
  description: string;
  minScore: string;
  minSimGrade: string;
  requiredPaths: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  company: "",
  description: "",
  minScore: "",
  minSimGrade: "",
  requiredPaths: [],
};

function PostingsTab({
  students,
  initialPostings,
}: {
  students: StudentRow[];
  initialPostings: JobPostingRow[];
}) {
  const [postings, setPostings] = useState<JobPostingRow[]>(initialPostings);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handlePathToggle(path: string) {
    setForm((f) => ({
      ...f,
      requiredPaths: f.requiredPaths.includes(path)
        ? f.requiredPaths.filter((p) => p !== path)
        : [...f.requiredPaths, path],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const requirements: JobPostingRow["requirements"] = {};
      if (form.minScore) requirements.minScore = parseInt(form.minScore, 10);
      if (form.minSimGrade) requirements.minSimGrade = form.minSimGrade;
      if (form.requiredPaths.length > 0) requirements.requiredPaths = form.requiredPaths;

      const res = await fetch("/api/recruiter/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          company: form.company,
          description: form.description,
          requirements,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error ?? "Failed to create posting");
        return;
      }

      const newPosting = await res.json();
      setPostings((prev) => [{ ...newPosting, createdAt: newPosting.createdAt ?? new Date().toISOString() }, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(posting: JobPostingRow) {
    setTogglingId(posting.id);
    // Optimistic
    setPostings((prev) =>
      prev.map((p) => (p.id === posting.id ? { ...p, active: !p.active } : p))
    );
    try {
      const res = await fetch(`/api/recruiter/postings/${posting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !posting.active }),
      });
      if (!res.ok) {
        // Revert
        setPostings((prev) =>
          prev.map((p) => (p.id === posting.id ? { ...p, active: posting.active } : p))
        );
      }
    } catch {
      setPostings((prev) =>
        prev.map((p) => (p.id === posting.id ? { ...p, active: posting.active } : p))
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {postings.length} posting{postings.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
          className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-sage-400 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Posting"}
        </button>
      </div>

      {/* New posting form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/8 bg-zinc-900/50 p-6 space-y-5"
        >
          <h3 className="font-semibold text-zinc-100">New Job Posting</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Job Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Security Analyst"
                className="w-full rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Company *</label>
              <input
                required
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              className="w-full rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none resize-none"
            />
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Candidate Requirements (optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Min Skill Score</label>
                <input
                  type="number"
                  min={0}
                  value={form.minScore}
                  onChange={(e) => setForm((f) => ({ ...f, minScore: e.target.value }))}
                  placeholder="e.g. 300"
                  className="w-full rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sage-500/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Min Sim Grade</label>
                <select
                  value={form.minSimGrade}
                  onChange={(e) => setForm((f) => ({ ...f, minSimGrade: e.target.value }))}
                  className="w-full rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-sage-500/50 focus:outline-none"
                >
                  {GRADE_REQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-zinc-900">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <label className="text-xs text-zinc-500">Required Learning Paths</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {PATH_CHECKBOXES.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiredPaths.includes(p.value)}
                      onChange={() => handlePathToggle(p.value)}
                      className="accent-sage-500"
                    />
                    <span className="text-sm text-zinc-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
              className="rounded-lg border border-white/8 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-sage-400 transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Posting"}
            </button>
          </div>
        </form>
      )}

      {/* Postings list */}
      {postings.length === 0 && !showForm ? (
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-10 text-center">
          <p className="text-zinc-500 text-sm">No job postings yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sage-500 text-sm hover:underline"
          >
            Create your first posting →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {postings.map((posting) => {
            const matchCount = countMatches(students, posting.requirements);
            const isToggling = togglingId === posting.id;
            return (
              <div
                key={posting.id}
                className={`rounded-xl border p-5 transition-colors ${
                  posting.active ? "border-white/8 bg-zinc-900/50" : "border-white/4 bg-zinc-950/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-zinc-100 truncate">{posting.title}</h3>
                      <span className="text-zinc-400 text-sm">{posting.company}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          posting.active
                            ? "bg-sage-500/15 text-sage-400"
                            : "bg-zinc-500/15 text-zinc-500"
                        }`}
                      >
                        {posting.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{posting.description}</p>

                    {/* Requirements */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {posting.requirements.minScore !== undefined && (
                        <ReqBadge>Score ≥ {posting.requirements.minScore}</ReqBadge>
                      )}
                      {posting.requirements.minSimGrade && (
                        <ReqBadge>Sim Grade ≥ {posting.requirements.minSimGrade}</ReqBadge>
                      )}
                      {posting.requirements.requiredPaths?.map((p) => (
                        <ReqBadge key={p}>{p}</ReqBadge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-bold text-sage-400">{matchCount}</p>
                      <p className="text-xs text-zinc-500">matches</p>
                    </div>
                    <button
                      onClick={() => toggleActive(posting)}
                      disabled={isToggling}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                        posting.active
                          ? "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                          : "border-sage-500/40 text-sage-400 hover:border-sage-500"
                      }`}
                    >
                      {isToggling ? "..." : posting.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReqBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/8 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
      {children}
    </span>
  );
}
