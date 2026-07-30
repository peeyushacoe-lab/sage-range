"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AssessmentTab } from "./assessment-tab";

import { Icon } from "@/components/ui/icon";
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
    case "A": return "text-ok";
    case "B": return "text-ok";
    case "C": return "text-warn";
    case "D": return "text-sev-high";
    case "F": return "text-danger";
  }
}


function gradeIndex(grade: SimGrade): number {
  return GRADE_ORDER.indexOf(grade);
}

// ── Candidate match count ─────────────────────────────────────────────────────

function filterMatches(students: StudentRow[], req: JobPostingRow["requirements"]): StudentRow[] {
  return students.filter((s) => {
    if (req.minScore !== undefined && s.skillScore < req.minScore) return false;
    if (req.minSimGrade) {
      const needed = gradeIndex(req.minSimGrade as SimGrade);
      const has = gradeIndex(s.simGrade);
      if (has > needed) return false;
    }
    if (req.requiredPaths && req.requiredPaths.length > 0) {
      const hasAll = req.requiredPaths.every((p) => s.completedPaths.includes(p));
      if (!hasAll) return false;
    }
    return true;
  });
}

function countMatches(students: StudentRow[], req: JobPostingRow["requirements"]): number {
  return filterMatches(students, req).length;
}

// ── Main component ────────────────────────────────────────────────────────────

export function RecruiterTabs({ students, bookmarkedIds, jobPostings }: Props) {
  const [tab, setTab] = useState<"candidates" | "assessments" | "postings">("candidates");
  const bookmarkedSet = new Set(bookmarkedIds);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-edge">
        <TabButton active={tab === "candidates"} onClick={() => setTab("candidates")}>
          Find Candidates
          <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{students.length}</span>
        </TabButton>
        <TabButton active={tab === "assessments"} onClick={() => setTab("assessments")}>
          Simulation Assessments
          <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
            {students.filter((s) => s.bestSimScore > 0).length}
          </span>
        </TabButton>
        <TabButton active={tab === "postings"} onClick={() => setTab("postings")}>
          My Job Postings
          <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{jobPostings.length}</span>
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
          ? "border-ok-edge text-ok"
          : "border-transparent text-ink-3 hover:text-ink-2"
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
          className="flex-1 min-w-48 rounded-lg border border-edge bg-surface-1 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none"
        />
        <input
          type="number"
          placeholder="Min score"
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          min={0}
          className="w-32 rounded-lg border border-edge bg-surface-1 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none"
        />
        <select
          value={minGrade}
          onChange={(e) => setMinGrade(e.target.value)}
          className="rounded-lg border border-edge bg-surface-1 px-3 py-2 text-sm text-ink focus:border-ok-edge focus:outline-none"
        >
          {GRADE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-1">
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          className="rounded-lg border border-edge bg-surface-1 px-3 py-2 text-sm text-ink focus:border-ok-edge focus:outline-none"
        >
          {PATH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-1">
              {o.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-edge px-3 py-2 text-sm text-ink-2 hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-ink-3">
        Showing {filtered.length} of {students.length} candidates
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-ink-3 text-xs uppercase tracking-wider">
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
          <tbody className="divide-y divide-edge-subtle">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-ink-3">
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
                    isBookmarked ? "bg-ok-wash hover:bg-ok-wash" : "hover:bg-surface-2"
                  }`}
                >
                  <td className="p-4 text-ink-3">{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-ink">
                          {s.displayName ?? s.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-ink-3">{s.email}</p>
                        <div className="flex gap-2 mt-1">
                          {s.linkedIn && (
                            <a
                              href={s.linkedIn}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-ok hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                          {s.github && (
                            <a
                              href={s.github}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-ok hover:underline"
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                      </div>
                      {isBookmarked && (
                        <span className="rounded-full bg-ok-wash px-2 py-0.5 text-xs font-medium text-ok">
                          Saved
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-ink-2">{s.university ?? "—"}</td>
                  <td className="p-4 text-right font-semibold text-ink">{s.skillScore}</td>
                  <td className="p-4 text-right text-ink-2">{s.labsSolved}</td>
                  <td className="p-4 text-center">
                    {s.bestSimScore > 0 ? (
                      <span className={`text-sm font-bold ${gradeColor(s.simGrade)}`}>
                        {s.simGrade}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {s.bestSimScore > 0 ? (
                      <span className="font-semibold text-ok">
                        {s.bestSimScore}
                        <span className="text-ink-3 font-normal text-xs"> · {s.simCount}x</span>
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {s.aiVerdict ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.aiVerdict === "Strong hire"
                            ? "bg-ok-wash text-ok"
                            : s.aiVerdict === "Potential hire"
                            ? "bg-warn-wash text-warn"
                            : "bg-danger-wash text-danger"
                        }`}
                      >
                        {s.aiVerdict}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-3">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleBookmark(s.id)}
                      disabled={isLoading}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark candidate"}
                      className={`text-xl transition-all disabled:opacity-40 ${
                        isBookmarked
                          ? "text-ok hover:text-ink-2"
                          : "text-ink-3 hover:text-ok"
                      }`}
                    >
                      {isBookmarked ? <Icon name="star" size={14} tone="gold" variant="gradient" /> : <Icon name="star" size={14} />}
                    </button>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/profile/${s.id}`}
                      className="text-xs text-ok hover:underline whitespace-nowrap"
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
  const [expandedPostingId, setExpandedPostingId] = useState<string | null>(null);

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
        <p className="text-sm text-ink-2">
          {postings.length} posting{postings.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
          className="rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-surface-0 hover:bg-accent-hover transition-colors"
        >
          {showForm ? "Cancel" : "+ New Posting"}
        </button>
      </div>

      {/* New posting form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-edge bg-surface-1 p-6 space-y-5"
        >
          <h3 className="font-semibold text-ink">New Job Posting</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-ink-2 uppercase tracking-wider">Job Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Security Analyst"
                className="w-full rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-ink-2 uppercase tracking-wider">Company *</label>
              <input
                required
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-ink-2 uppercase tracking-wider">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              className="w-full rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none resize-none"
            />
          </div>

          <div className="border-t border-edge pt-4">
            <p className="text-xs text-ink-2 uppercase tracking-wider mb-3">Candidate Requirements (optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-ink-3">Min Skill Score</label>
                <input
                  type="number"
                  min={0}
                  value={form.minScore}
                  onChange={(e) => setForm((f) => ({ ...f, minScore: e.target.value }))}
                  placeholder="e.g. 300"
                  className="w-full rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-sm text-ink placeholder-ink-3 focus:border-ok-edge focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-ink-3">Min Sim Grade</label>
                <select
                  value={form.minSimGrade}
                  onChange={(e) => setForm((f) => ({ ...f, minSimGrade: e.target.value }))}
                  className="w-full rounded-lg border border-edge bg-surface-2/50 px-3 py-2 text-sm text-ink focus:border-ok-edge focus:outline-none"
                >
                  {GRADE_REQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-surface-1">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <label className="text-xs text-ink-3">Required Learning Paths</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {PATH_CHECKBOXES.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requiredPaths.includes(p.value)}
                      onChange={() => handlePathToggle(p.value)}
                      className="accent-sage-500"
                    />
                    <span className="text-sm text-ink-2">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-danger bg-danger-wash rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null); }}
              className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-ok px-4 py-2 text-sm font-semibold text-surface-0 hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Posting"}
            </button>
          </div>
        </form>
      )}

      {/* Postings list */}
      {postings.length === 0 && !showForm ? (
        <div className="rounded-xl border border-edge bg-surface-1 p-10 text-center">
          <p className="text-ink-3 text-sm">No job postings yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-ok text-sm hover:underline"
          >
            Create your first posting →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {postings.map((posting) => {
            const matches = filterMatches(students, posting.requirements);
            const matchCount = matches.length;
            const isToggling = togglingId === posting.id;
            const isExpanded = expandedPostingId === posting.id;
            return (
              <div
                key={posting.id}
                className={`rounded-xl border transition-colors ${
                  posting.active ? "border-edge bg-surface-1" : "border-edge-subtle bg-surface-0/50 opacity-60"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-ink truncate">{posting.title}</h3>
                        <span className="text-ink-2 text-sm">{posting.company}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            posting.active
                              ? "bg-ok-wash text-ok"
                              : "bg-surface-3 text-ink-3"
                          }`}
                        >
                          {posting.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-ink-3 mt-1 line-clamp-2">{posting.description}</p>

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
                        <button
                          onClick={() => setExpandedPostingId(isExpanded ? null : posting.id)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <p className="text-xl font-bold text-ok">{matchCount}</p>
                          <p className="text-xs text-ok underline underline-offset-2">
                            {isExpanded ? "hide" : "view"} matches
                          </p>
                        </button>
                      </div>
                      <button
                        onClick={() => toggleActive(posting)}
                        disabled={isToggling}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                          posting.active
                            ? "border-edge-strong text-ink-2 hover:text-ink hover:border-edge-strong"
                            : "border-ok-edge text-ok hover:border-ok-edge"
                        }`}
                      >
                        {isToggling ? "..." : posting.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Matches drill-down */}
                {isExpanded && (
                  <div className="border-t border-edge px-5 py-4">
                    {matches.length === 0 ? (
                      <p className="text-sm text-ink-3">No candidates currently meet these requirements.</p>
                    ) : (
                      <>
                        <p className="text-xs text-ink-3 uppercase tracking-wider mb-3">
                          {matches.length} qualifying candidate{matches.length !== 1 ? "s" : ""}
                        </p>
                        <div className="space-y-2">
                          {matches.slice(0, 10).map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-4 rounded-lg border border-edge-subtle bg-surface-0/50 px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-ink truncate">
                                  {s.displayName ?? s.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-ink-3 truncate">{s.email}</p>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 text-xs">
                                <div className="text-right">
                                  <p className="text-ink-2 font-semibold">{s.skillScore}</p>
                                  <p className="text-ink-3">score</p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${gradeColor(s.simGrade)}`}>
                                    {s.bestSimScore > 0 ? s.simGrade : "—"}
                                  </p>
                                  <p className="text-ink-3">sim</p>
                                </div>
                                {s.aiVerdict && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    s.aiVerdict === "Strong hire"
                                      ? "bg-ok-wash text-ok"
                                      : s.aiVerdict === "Potential hire"
                                      ? "bg-warn-wash text-warn"
                                      : "bg-danger-wash text-danger"
                                  }`}>
                                    {s.aiVerdict}
                                  </span>
                                )}
                                <a
                                  href={`/profile/${s.id}`}
                                  className="text-ok hover:underline whitespace-nowrap"
                                >
                                  Profile →
                                </a>
                              </div>
                            </div>
                          ))}
                          {matches.length > 10 && (
                            <p className="text-xs text-ink-3 text-center pt-1">
                              +{matches.length - 10} more — use Find Candidates tab with filters
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
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
    <span className="rounded-full border border-edge bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">
      {children}
    </span>
  );
}
