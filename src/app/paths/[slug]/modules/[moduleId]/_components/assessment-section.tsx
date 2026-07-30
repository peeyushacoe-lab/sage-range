"use client";

import { useState, useRef } from "react";

type SubmissionType = "TEXT" | "PDF" | "IMAGE" | "ZIP" | "GITHUB_LINK";

interface Submission {
  id: string;
  type: SubmissionType;
  content: string;
  submittedAt: string;
  review: {
    status: string;
    grade: string | null;
    comment: string | null;
  } | null;
}

interface Props {
  moduleId: string;
  assessmentId: string;
  instructions: string;
  existingSubmission: Submission | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-warn border-warn-edge bg-warn-wash",
  APPROVED: "text-ok border-ok-edge bg-ok-wash",
  REJECTED: "text-danger border-danger-edge bg-danger-wash",
  CHANGES_REQUESTED: "text-sev-high border-sev-high-edge bg-sev-high-wash",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes Requested",
};

const FILE_TYPES: Record<string, string> = {
  PDF: ".pdf",
  IMAGE: ".png,.jpg,.jpeg,.webp",
  ZIP: ".zip",
};

export function AssessmentSection({ moduleId, assessmentId, instructions, existingSubmission }: Props) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>("TEXT");
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submission | null>(existingSubmission);
  const fileRef = useRef<HTMLInputElement>(null);

  const isFileType = submissionType === "PDF" || submissionType === "IMAGE" || submissionType === "ZIP";
  const isUrlType = submissionType === "GITHUB_LINK";

  const submit = async () => {
    setLoading(true);
    setError(null);

    try {
      let content = "";

      if (isFileType) {
        if (!file) { setError("Please select a file"); setLoading(false); return; }
        const form = new FormData();
        form.append("file", file);
        form.append("type", submissionType);
        const uploadRes = await fetch(`/api/modules/${moduleId}/assessment/upload`, {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          setError(d.error ?? "Upload failed");
          return;
        }
        const { url } = await uploadRes.json();
        content = url;
      } else if (isUrlType) {
        if (!urlContent.trim()) { setError("Please enter a URL"); setLoading(false); return; }
        content = urlContent.trim();
      } else {
        if (!textContent.trim()) { setError("Please write your response"); setLoading(false); return; }
        content = textContent.trim();
      }

      const res = await fetch(`/api/modules/${moduleId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, type: submissionType, content }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Submission failed");
        return;
      }

      const data: Submission = await res.json();
      setSubmitted(data);
    } catch {
      setError("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    const statusColor = STATUS_COLORS[submitted.review?.status ?? "PENDING"] ?? STATUS_COLORS.PENDING;
    const statusLabel = STATUS_LABELS[submitted.review?.status ?? "PENDING"] ?? "Awaiting Review";

    return (
      <div className="space-y-6">
        <div className={`rounded-xl border p-5 ${statusColor}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest font-semibold">Review Status</p>
            <span className="text-sm font-semibold">{statusLabel}</span>
          </div>
          {submitted.review?.grade && (
            <p className="text-sm">Grade: <span className="font-bold">{submitted.review.grade}</span></p>
          )}
          {submitted.review?.comment && (
            <p className="text-sm mt-2 leading-relaxed">{submitted.review.comment}</p>
          )}
        </div>

        <div className="rounded-xl border border-edge p-5">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Your Submission</p>
          <p className="text-xs text-ink-3 mb-2">
            Type: {submitted.type} · Submitted {new Date(submitted.submittedAt).toLocaleDateString()}
          </p>
          {submitted.type === "TEXT" ? (
            <p className="text-sm text-ink-2 whitespace-pre-wrap">{submitted.content}</p>
          ) : (
            <a
              href={submitted.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ok hover:underline break-all"
            >
              {submitted.content}
            </a>
          )}
        </div>

        {submitted.review?.status === "CHANGES_REQUESTED" && (
          <button
            onClick={() => setSubmitted(null)}
            className="w-full rounded-lg border border-edge px-4 py-3 text-sm font-semibold text-ink-2 hover:border-ok-edge hover:text-ok transition"
          >
            Resubmit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-edge bg-white/2 p-5">
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Instructions</p>
        <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{instructions}</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Submission Type</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(["TEXT", "PDF", "IMAGE", "ZIP", "GITHUB_LINK"] as SubmissionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSubmissionType(t)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                submissionType === t
                  ? "border-ok-edge bg-ok-wash text-ok"
                  : "border-edge text-ink-3 hover:text-ink-2 hover:border-edge-strong"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {submissionType === "TEXT" && (
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">Your Response</p>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            rows={10}
            placeholder="Write your response here..."
            className="w-full rounded-lg border border-edge bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge resize-none"
          />
        </div>
      )}

      {isUrlType && (
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">GitHub Repository URL</p>
          <input
            type="url"
            value={urlContent}
            onChange={(e) => setUrlContent(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="w-full rounded-lg border border-edge bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
          />
        </div>
      )}

      {isFileType && (
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">Upload File</p>
          <input
            ref={fileRef}
            type="file"
            accept={FILE_TYPES[submissionType]}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-lg border border-dashed border-edge-strong p-8 text-center hover:border-ok-edge transition"
          >
            {file ? (
              <p className="text-sm text-ink-2">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
            ) : (
              <p className="text-sm text-ink-3">Click to choose a {submissionType.toLowerCase()} file</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger rounded-lg border border-danger-edge bg-danger-wash px-4 py-3">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-ok px-4 py-3 text-sm font-semibold text-surface-0 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Submitting…" : "Submit Assessment"}
      </button>
    </div>
  );
}
