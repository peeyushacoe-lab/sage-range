import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ certCode: string }> }) {
  const { certCode } = await params;

  const cert = await db.academyCertificate.findUnique({
    where: { certCode },
    include: {
      user:   { select: { displayName: true, email: true } },
      course: { select: { title: true, difficulty: true, estimatedHrs: true } },
    },
  });
  if (!cert) notFound();

  const name = cert.user.displayName ?? cert.user.email.split("@")[0];
  const issued = cert.issuedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 py-16 print:bg-white">
      <div className="w-full max-w-2xl">
        {/* Certificate card */}
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-zinc-900/60 print:bg-white print:border-emerald-600 p-10 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5 pointer-events-none select-none" aria-hidden>
            <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-emerald-500 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-emerald-500 translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-500 font-semibold mb-2 print:text-emerald-600">Sage Vault Academy</p>
            <p className="text-xs text-zinc-500 mb-8 print:text-zinc-600">Certificate of Completion</p>

            <p className="text-sm text-zinc-400 mb-2 print:text-zinc-600">This is to certify that</p>
            <h1 className="text-3xl font-bold text-white mb-2 print:text-zinc-900">{name}</h1>
            <p className="text-sm text-zinc-400 mb-8 print:text-zinc-600">has successfully completed</p>

            <h2 className="text-xl font-bold text-emerald-400 mb-1 print:text-emerald-600">{cert.course.title}</h2>
            <p className="text-xs text-zinc-500 mb-10 print:text-zinc-500">
              {cert.course.difficulty} · {cert.course.estimatedHrs > 0 ? `${cert.course.estimatedHrs} hours` : ""}
            </p>

            <div className="flex items-center justify-center gap-12 mb-10">
              <div className="text-center">
                <div className="w-16 h-px bg-zinc-700 mx-auto mb-2 print:bg-zinc-400" />
                <p className="text-xs text-zinc-600 print:text-zinc-500">Date Issued</p>
                <p className="text-xs text-zinc-400 font-semibold print:text-zinc-700">{issued}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-px bg-zinc-700 mx-auto mb-2 print:bg-zinc-400" />
                <p className="text-xs text-zinc-600 print:text-zinc-500">Certificate ID</p>
                <p className="text-xs text-zinc-400 font-semibold font-mono print:text-zinc-700">{certCode}</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-[10px] text-zinc-600 border border-white/8 rounded-full px-4 py-1.5 print:border-zinc-300 print:text-zinc-500">
              <span className="text-emerald-500">✓</span>
              Verified · cybersagevault.uk/academy/certificate/{certCode}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6 print:hidden">
          <button onClick={() => window.print()} className="text-sm text-zinc-400 border border-white/10 px-4 py-2 rounded-xl hover:text-white transition">
            Print / Save as PDF
          </button>
          <a href="/academy" className="text-sm text-zinc-400 border border-white/10 px-4 py-2 rounded-xl hover:text-white transition">
            Back to Academy
          </a>
        </div>
      </div>
    </div>
  );
}
