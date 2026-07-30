"use client";

interface LinkedInShareBtnProps {
  certId: string;
  issueYear: number;
  issueMonth: number;
}

export function LinkedInShareBtn({ certId, issueYear, issueMonth }: LinkedInShareBtnProps) {
  function handleClick() {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: "IR Commander Certificate",
      issueYear: String(issueYear),
      issueMonth: String(issueMonth),
      certUrl: `${window.location.origin}/verify/${certId}`,
      certId,
    });
    window.open(
      `https://www.linkedin.com/profile/add?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg border border-info-edge bg-info-wash px-5 py-2.5 text-sm font-semibold text-info hover:bg-info-wash transition"
    >
      Add to LinkedIn Profile
    </button>
  );
}
