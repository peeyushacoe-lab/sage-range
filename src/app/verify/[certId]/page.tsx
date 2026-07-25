import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CertificateFrame } from "@/components/certificate/certificate-frame";
import { certificateQrSvg } from "@/components/certificate/qr";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>;
}): Promise<Metadata> {
  const { certId } = await params;

  const cert = await db.iRCertification.findUnique({
    where: { certId },
    select: { unlockedAt: true, user: { select: { displayName: true, email: true } } },
  });

  if (!cert) {
    return { title: "Certificate Verification — Sage Vault" };
  }

  const candidateName = cert.user.displayName ?? cert.user.email.split("@")[0];
  const title = `${candidateName} — IR Commander Certificate | Sage Vault`;
  const description = `Verified Sage Vault IR Commander Certification, issued ${formatDate(cert.unlockedAt)}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
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

  const verify = {
    qrSvg: await certificateQrSvg(`https://www.cybersagevault.uk/verify/${cert.certId}`),
    display: `cybersagevault.uk/verify/${cert.certId}`,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <p className="text-emerald-400 font-bold text-sm tracking-[0.3em] uppercase">✓ Verified — this certification is on record</p>
        </div>
        <CertificateFrame
          recipientName={candidateName}
          intro="has earned the"
          title="IR Commander Certification"
          detail="awarded for incident response leadership demonstrated across live-fire simulations and completed learning paths."
          issuedOn={cert.unlockedAt}
          stats={[{ icon: "shield", label: "Certificate ID", value: cert.certId }]}
          verify={verify}
        />
      </div>
    </div>
  );
}
