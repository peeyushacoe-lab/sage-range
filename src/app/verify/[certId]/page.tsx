import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;

  const cert = await db.iRCertification.findUnique({
    where: { certId },
    include: { user: { select: { displayName: true, email: true } } },
  });

  if (!cert) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg text-center space-y-4">
          <p className="text-5xl font-bold text-red-400">✗</p>
          <h1 className="text-2xl font-bold">Certificate Not Found</h1>
          <p className="text-zinc-400">
            Certificate not found or revoked.
          </p>
          <p className="text-xs text-zinc-600 font-mono">{certId}</p>
        </div>
      </div>
    );
  }

  const candidateName =
    cert.user.displayName ?? cert.user.email.split("@")[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/8 bg-zinc-900/60 p-12 flex flex-col items-center text-center gap-6">
        <p className="text-5xl font-bold text-emerald-400">✓</p>
        <p className="text-emerald-400 font-bold text-xl tracking-wide uppercase">
          Verified
        </p>

        <div className="w-16 h-px bg-white/10" />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            IR Commander Certificate
          </p>
          <p className="text-2xl font-bold">{candidateName}</p>
        </div>

        <div className="w-16 h-px bg-white/10" />

        <div className="space-y-1 text-sm text-zinc-400">
          <p>Issued by Sage Forge &middot; {formatDate(cert.unlockedAt)}</p>
          <p className="font-mono text-xs text-zinc-500">{cert.certId}</p>
        </div>

        <p className="text-xs text-zinc-500">
          This certification is verified and on record.
        </p>
      </div>
    </div>
  );
}
