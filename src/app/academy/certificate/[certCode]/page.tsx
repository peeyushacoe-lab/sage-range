import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintBtn } from "./_components/print-btn";
import { CertificateFrame, type SidebarStat } from "@/components/certificate/certificate-frame";
import { certificateQrSvg } from "@/components/certificate/qr";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ certCode: string }> }) {
  const { certCode } = await params;

  const cert = await db.academyCertificate.findUnique({
    where: { certCode },
    include: {
      user:   { select: { displayName: true, email: true } },
      course: {
        select: {
          title: true, difficulty: true,
          modules: {
            where: { published: true },
            orderBy: { order: "asc" },
            select: {
              title: true,
              lessons: { where: { published: true }, select: { durationMin: true } },
            },
          },
        },
      },
    },
  });
  if (!cert) notFound();

  const name = cert.user.displayName ?? cert.user.email.split("@")[0];
  const domains = cert.course.modules.map((m) => m.title).slice(0, 6);
  const totalMinutes = cert.course.modules.reduce(
    (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationMin, 0), 0
  );

  const stats: SidebarStat[] = [];
  if (totalMinutes > 0) {
    stats.push({ icon: "clock", label: "Training Time", value: formatDuration(totalMinutes) });
  }
  stats.push(
    { icon: "target", label: "Difficulty", value: cert.course.difficulty },
    { icon: "shield", label: "Certificate ID", value: certCode },
  );

  const verify = {
    qrSvg: await certificateQrSvg(`https://www.cybersagevault.uk/academy/certificate/${certCode}`),
    display: `cybersagevault.uk/academy/certificate/${certCode}`,
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 sm:px-6 py-16 print:bg-white print:py-0">
      <div className="w-full max-w-5xl">
        <CertificateFrame
          recipientName={name}
          intro="has successfully completed the"
          title={cert.course.title}
          detail="including all lessons, knowledge checks, and module quizzes of this Sage Vault Academy course."
          issuedOn={cert.issuedAt}
          stats={stats}
          lists={domains.length > 0 ? [{ icon: "layers", label: "Covered Modules", items: domains }] : []}
          verify={verify}
        />

        <div className="flex justify-center gap-4 mt-6 print:hidden">
          <PrintBtn />
          <a href="/academy" className="text-sm text-zinc-400 border border-white/10 px-4 py-2 rounded-xl hover:text-white transition">
            Back to Academy
          </a>
        </div>
      </div>
    </div>
  );
}
