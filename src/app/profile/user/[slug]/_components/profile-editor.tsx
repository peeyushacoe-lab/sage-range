"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export interface ProfileEditorProps {
  portfolioId: string;
  userId: string;
  initialBio?: string | null;
  initialVisibility?: "PRIVATE" | "PUBLIC" | "RECRUITER_ONLY";
  onClose: () => void;
}

/**
 * Profile Editor Modal
 * Allows users to edit bio and visibility settings
 */
export function ProfileEditor({
  portfolioId,
  userId,
  initialBio,
  initialVisibility,
  onClose,
}: ProfileEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bio, setBio] = useState(initialBio ?? "");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC" | "RECRUITER_ONLY">(
    initialVisibility ?? "PRIVATE"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bio.length > 500) {
      setError("Bio must be 500 characters or less");
      return;
    }

    startTransition(async () => {
      try {
        // Update bio
        if (bio !== initialBio) {
          const bioRes = await fetch("/api/portfolio", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bio: bio || null }),
          });
          if (!bioRes.ok) {
            throw new Error("Failed to update bio");
          }
        }

        // Update visibility if changed
        if (visibility !== initialVisibility) {
          const visRes = await fetch("/api/portfolio/visibility", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility }),
          });
          if (!visRes.ok) {
            throw new Error("Failed to update visibility");
          }
        }

        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-edge rounded-xl w-full max-w-md">
        <div className="p-6 border-b border-edge-subtle flex items-center justify-between">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-2 transition"
            aria-label="Close"
          >
            <Icon name="close" size={20} variant="current" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Bio field */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-3 mb-2">
              Bio <span className="text-ink-3">(max 500 chars)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell recruiters about yourself..."
              maxLength={500}
              rows={4}
              className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-edge-strong resize-none transition"
            />
            <p className="text-xs text-ink-3 mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Visibility section */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-ink-3 mb-3">
              Portfolio Visibility
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "PRIVATE",
                  label: "Private",
                  desc: "Only visible to you",
                },
                {
                  value: "PUBLIC",
                  label: "Public",
                  desc: "Visible to everyone",
                },
                {
                  value: "RECRUITER_ONLY",
                  label: "Recruiters Only",
                  desc: "Only visible to verified recruiters",
                },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer hover:bg-surface-2/50"
                  style={{
                    borderColor: visibility === option.value ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    backgroundColor: visibility === option.value ? "rgba(255, 255, 255, 0.04)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={visibility === option.value}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{option.label}</p>
                    <p className="text-xs text-ink-3">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-danger-edge bg-danger-wash p-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-edge-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-edge text-ink-2 hover:border-edge-strong disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-ok text-white hover:bg-ok-wash disabled:opacity-50 transition font-medium"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
