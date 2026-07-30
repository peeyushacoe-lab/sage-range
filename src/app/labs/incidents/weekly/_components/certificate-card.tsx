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
    <div className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-8">
      <div className="text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
            <Icon name="award" size={32} className="text-amber-400" />
          </div>
        </div>

        {/* Certificate title */}
        <p className="text-sm uppercase tracking-widest text-amber-400 mb-2">
          Certificate of Achievement
        </p>
        <h2 className="text-2xl font-bold text-white mb-1">
          Weekly Incident Challenge
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          Season {season} · Week {weekNumber}
        </p>

        {/* Horizontal line */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent my-6" />

        {/* Certificate details */}
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs text-zinc-600 mb-1">Awarded to</p>
            <p className="text-lg font-semibold text-white">{userEmail}</p>
          </div>

          <div>
            <p className="text-xs text-zinc-600 mb-1">Certificate Code</p>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono text-sm font-bold text-amber-400">
                {certCode}
              </code>
              <button
                onClick={handleCopyCertCode}
                className="p-1.5 rounded hover:bg-white/5 transition"
                title="Copy certificate code"
              >
                <Icon name="copy" size={14} className="text-zinc-500 hover:text-zinc-300" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs text-zinc-600 mb-1">Issued Date</p>
            <p className="text-sm text-zinc-300">
              {new Date(issuedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Horizontal line */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent my-6" />

        {/* Actions */}
        <div className="flex gap-3 flex-col sm:flex-row">
          <button className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 font-semibold text-amber-400 hover:bg-amber-500/20 transition text-sm">
            Download PDF
          </button>
          <button
            onClick={handleShareCertificate}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 font-semibold text-white hover:bg-white/10 transition text-sm"
          >
            Share Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
