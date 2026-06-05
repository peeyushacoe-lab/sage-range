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
      organizationId: "",
      issueYear: String(issueYear),
      issueMonth: String(issueMonth),
      certUrl: `https://cybersage.uk/verify/${certId}`,
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
      className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition"
    >
      Add to LinkedIn Profile
    </button>
  );
}
