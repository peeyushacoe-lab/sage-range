"use client";

import { Icon } from "@/components/ui/icon";

interface CertificateCardProps {
  certCode: string;
  season: number;
  weekNumber: number;
  issuedAt: string;
  userEmail: string;
}

export function CertificateCard({
  certCode,
  season,
  weekNumber,
  issuedAt,
  userEmail,
}: CertificateCardProps) {
  const handleCopyCertCode = async () => {
    try {
      await navigator.clipboard.writeText(certCode);
    } catch (error) {
      console.error("Failed to copy certificate code:", error);
    }
  };

  const handleShareCertificate = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Weekly Incident Challenge Certificate",
          text: `I completed the Weekly Incident Challenge for Season ${season}, Week ${weekNumber}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  return (
    <div className="rounded-xl border-2 border-warn-edge bg-gradient-to-br from-warn to-transparent p-8">
      <div className="text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-warn-wash border-2 border-warn-edge flex items-center justify-center">
            <Icon name="award" size={32} className="text-warn" />
          </div>
        </div>

        {/* Certificate title */}
        <p className="text-sm uppercase tracking-widest text-ink-3 mb-2">
          Certificate of Achievement
        </p>
        <h2 className="text-2xl font-bold text-white mb-1">
          Weekly Incident Challenge
        </h2>
        <p className="text-sm text-ink-2 mb-6">
          Season {season} · Week {weekNumber}
        </p>

        {/* Horizontal line */}
        <div className="h-px bg-gradient-to-r from-transparent via-warn to-transparent my-6" />

        {/* Certificate details */}
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs text-ink-3 mb-1">Awarded to</p>
            <p className="text-lg font-semibold text-white">{userEmail}</p>
          </div>

          <div>
            <p className="text-xs text-ink-3 mb-1">Certificate Code</p>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono text-sm font-bold text-warn">
                {certCode}
              </code>
              <button
                onClick={handleCopyCertCode}
                className="p-1.5 rounded hover:bg-surface-2 transition"
                title="Copy certificate code"
              >
                <Icon name="copy" size={14} className="text-ink-3 hover:text-ink-2" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-3 mb-1">Issued Date</p>
            <p className="text-sm text-ink-2">
              {new Date(issuedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Horizontal line */}
        <div className="h-px bg-gradient-to-r from-transparent via-warn to-transparent my-6" />

        {/* Actions */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <button className="flex-1 px-4 py-2.5 rounded-lg bg-warn-wash border border-warn-edge font-semibold text-warn hover:bg-warn-wash transition text-sm">
            Download PDF
          </button>
          <button
            onClick={handleShareCertificate}
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface-2 border border-edge font-semibold text-white hover:bg-surface-2 transition text-sm"
          >
            Share Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
