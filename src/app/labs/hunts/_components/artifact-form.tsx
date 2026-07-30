"use client";

import { useState } from "react";
import { Button, Card, CardHeader, CardContent } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

type ArtifactType = "IP" | "DOMAIN" | "PROCESS" | "FILE" | "REGISTRY" | "HASH" | "USER" | "EMAIL" | "PORT";

const ARTIFACT_TYPES: ArtifactType[] = ["IP", "DOMAIN", "PROCESS", "FILE", "REGISTRY", "HASH", "USER", "EMAIL", "PORT"];

interface Toast {
  type: "success" | "error";
  message: string;
}

export function ArtifactForm({ sessionId }: { sessionId: string }) {
  const [type, setType] = useState<ArtifactType>("IP");
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!value.trim()) {
      setToast({ type: "error", message: "Please enter an artifact value" });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/hunts/${sessionId}/report-artifact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: value.trim(), confidence }),
      });

      if (res.status === 409) {
        setToast({ type: "error", message: "Artifact already reported" });
        return;
      }

      if (res.status === 400) {
        setToast({ type: "error", message: "Invalid artifact value" });
        return;
      }

      if (!res.ok) {
        setToast({ type: "error", message: "Failed to submit artifact" });
        return;
      }

      const data = await res.json();
      setToast({
        type: "success",
        message: `Artifact submitted (+${data.scoreGained} points)`,
      });
      setValue("");
      setConfidence(80);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-0">
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <Icon name="target" size={16} />
          Report Artifact
        </h3>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="text-xs uppercase tracking-widest text-ink-3 block mb-2">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ArtifactType)}
              disabled={isSubmitting}
              className="w-full text-sm bg-surface-1 border border-edge rounded px-3 py-2 text-white focus:outline-none focus:border-ok-edge"
            >
              {ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          <div>
            <label className="text-xs uppercase tracking-widest text-ink-3 block mb-2">
              Value
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${type.toLowerCase()}...`}
              disabled={isSubmitting}
              className="w-full text-sm bg-surface-1 border border-edge rounded px-3 py-2 text-white placeholder-ink-3 focus:outline-none focus:border-ok-edge"
            />
          </div>

          {/* Confidence Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-widest text-ink-3">
                Confidence
              </label>
              <span className="text-sm font-semibold text-white">{confidence}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              disabled={isSubmitting}
              className="w-full h-2 bg-surface-1 rounded cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-ink-3 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting || !value.trim()}
            className="w-full"
          >
            <Icon name="check" size={16} />
            {isSubmitting ? "Submitting..." : "Submit Artifact"}
          </Button>
        </form>

        {/* Toast */}
        {toast && (
          <div
            className={`px-3 py-2 rounded text-xs font-semibold flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-ok-wash border border-ok-edge text-ok"
                : "bg-danger-wash border border-danger-edge text-danger"
            }`}
          >
            <Icon name={toast.type === "success" ? "checkCircle" : "alert"} size={14} />
            {toast.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
