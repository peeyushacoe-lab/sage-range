import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = "Sage Vault <noreply@cybersage.uk>";

function wrap(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#f4f4f5; }
  .container { max-width:560px; margin:40px auto; padding:0 20px; }
  .card { background:#18181b; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:40px; }
  .logo { font-size:12px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:#10b981; margin-bottom:24px; }
  h1 { font-size:22px; font-weight:700; margin:0 0 12px; color:#f4f4f5; }
  p { font-size:14px; line-height:1.6; color:#a1a1aa; margin:0 0 16px; }
  .btn { display:inline-block; padding:12px 24px; background:#10b981; color:#000; font-weight:600; font-size:14px; border-radius:10px; text-decoration:none; margin:8px 0 16px; }
  .divider { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:24px 0; }
  .footer { font-size:11px; color:#52525b; text-align:center; margin-top:24px; }
  .stat { display:inline-block; text-align:center; padding:12px 20px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; margin:4px; }
  .stat-val { font-size:24px; font-weight:700; color:#f4f4f5; display:block; }
  .stat-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#71717a; display:block; margin-top:2px; }
  .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Sage Vault</div>
    ${content}
    <hr class="divider" />
    <p style="font-size:12px;color:#52525b;">You received this email because you have an account on Sage Vault. <a href="https://www.cybersagevault.uk" style="color:#71717a;">cybersagevault.uk</a></p>
  </div>
  <div class="footer">© 2026 Sage Vault · <a href="https://www.cybersagevault.uk/legal/privacy" style="color:#52525b;">Privacy</a> · <a href="https://www.cybersagevault.uk/legal/terms" style="color:#52525b;">Terms</a></div>
</div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string, role: string) {
  if (!resend) return;

  const roleLabel = role === "INSTRUCTOR" ? "instructor" : role === "RECRUITER" ? "recruiter" : "student";
  const ctaHref = role === "INSTRUCTOR" ? "https://www.cybersagevault.uk/classroom"
    : role === "RECRUITER" ? "https://www.cybersagevault.uk/recruiter"
    : "https://www.cybersagevault.uk/labs";
  const ctaLabel = role === "INSTRUCTOR" ? "Create your first classroom →"
    : role === "RECRUITER" ? "Browse the talent marketplace →"
    : "Start your first lab →";

  const html = wrap(`
    <h1>Welcome to Sage Vault, ${name}</h1>
    <p>Your account is set up as a <strong style="color:#f4f4f5;">${roleLabel}</strong>. Here's what you can do next:</p>
    ${role === "STUDENT" ? `
    <p>✓ Complete hands-on labs to build your skill score<br/>
    ✓ Run live cyber incident simulations<br/>
    ✓ Earn verified certificates visible to recruiters</p>` : ""}
    ${role === "INSTRUCTOR" ? `
    <p>✓ Create classrooms and invite students with a join code<br/>
    ✓ Assign labs and simulation scenarios<br/>
    ✓ Track progress and download performance reports</p>` : ""}
    ${role === "RECRUITER" ? `
    <p>✓ Browse simulation-verified candidates<br/>
    ✓ Filter by EXCEPTIONAL / STRONG / ADEQUATE ratings<br/>
    ✓ Post job listings and bookmark talent</p>` : ""}
    <a href="${ctaHref}" class="btn">${ctaLabel}</a>
    <p style="font-size:12px;color:#52525b;">You can change your role anytime from your profile settings.</p>
  `, "Welcome to Sage Vault");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to Sage Vault — you're all set`,
    html,
  });
}

export async function sendClassroomJoinEmail(
  to: string,
  studentName: string,
  classroomName: string,
  instructorName: string,
  classroomId: string
) {
  if (!resend) return;

  const html = wrap(`
    <h1>You've joined a classroom</h1>
    <p>Hi ${studentName},</p>
    <p>You've successfully enrolled in <strong style="color:#f4f4f5;">${classroomName}</strong>, taught by ${instructorName}.</p>
    <p>Your instructor will assign labs and simulation exercises through this classroom. You'll be notified when new work is available.</p>
    <a href="https://www.cybersagevault.uk/classroom/${classroomId}" class="btn">Go to classroom →</a>
  `, "You've joined a classroom");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've joined: ${classroomName}`,
    html,
  });
}

export async function sendSimCertificateEmail(
  to: string,
  name: string,
  scenario: string,
  score: number,
  rating: string,
  sessionId: string
) {
  if (!resend) return;

  const ratingColor = rating === "EXCEPTIONAL" ? "#10b981"
    : rating === "STRONG" ? "#3b82f6"
    : rating === "ADEQUATE" ? "#f59e0b"
    : "#f97316";

  const html = wrap(`
    <h1>Simulation complete — ${rating}</h1>
    <p>Hi ${name},</p>
    <p>You've completed <strong style="color:#f4f4f5;">${scenario}</strong> and your verified certificate is ready.</p>
    <div style="text-align:center;margin:24px 0;">
      <span class="stat">
        <span class="stat-val">${score}</span>
        <span class="stat-label">Score</span>
      </span>
      <span class="stat">
        <span class="stat-val" style="color:${ratingColor};">${rating}</span>
        <span class="stat-label">Assessment</span>
      </span>
    </div>
    <p>Your certificate includes a public verification URL you can share with employers or on LinkedIn.</p>
    <a href="https://www.cybersagevault.uk/simulation/${sessionId}/certificate" class="btn">Download certificate →</a>
    <a href="https://www.cybersagevault.uk/simulation/${sessionId}/debrief" style="display:inline-block;padding:12px 24px;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;font-size:14px;border-radius:10px;text-decoration:none;margin:4px 0 16px 8px;">View debrief</a>
    <p style="font-size:12px;color:#52525b;">
      Verification URL: https://www.cybersagevault.uk/verify/simulation/${sessionId}
    </p>
  `, "Your simulation certificate is ready");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your simulation certificate — ${scenario} (${rating})`,
    html,
  });
}

export async function sendLabAssignedEmail(
  to: string,
  studentName: string,
  labTitle: string,
  classroomName: string,
  classroomId: string,
  dueDate?: string
) {
  if (!resend) return;

  const html = wrap(`
    <h1>New lab assigned</h1>
    <p>Hi ${studentName},</p>
    <p>Your instructor has assigned a new lab in <strong style="color:#f4f4f5;">${classroomName}</strong>:</p>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#f4f4f5;">${labTitle}</p>
      ${dueDate ? `<p style="margin:6px 0 0;font-size:12px;color:#71717a;">Due: ${dueDate}</p>` : ""}
    </div>
    <a href="https://www.cybersagevault.uk/classroom/${classroomId}" class="btn">Go to classroom →</a>
  `, "New lab assigned");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New lab assigned: ${labTitle}`,
    html,
  });
}

/**
 * Operation Zero Hour results.
 *
 * NOT CURRENTLY WIRED UP. concludeCompetition announces results through in-app
 * notifications and a site-wide announcement only. This is kept ready for the
 * moment RESEND_API_KEY is configured — call it from announceResults in
 * src/lib/ozh.ts, which already has the per-analyst loop it needs.
 *
 * Sent once per analyst when the competition concludes. Deliberately leads with
 * the Knight badge rather than the rank: most of the field did not place, and a
 * mail whose first line is "you came 14th" is one nobody opens next time.
 */
export async function sendZeroHourResultEmail(args: {
  to: string;
  name: string;
  score: number;
  maxScore: number;
  rank: number | null;
  fieldSize: number;
  knightTier: string | null;
  knightLabel: string | null;
  knightBlurb: string | null;
}) {
  if (!resend) return;

  const { to, name, score, maxScore, rank, fieldSize, knightTier, knightLabel, knightBlurb } = args;

  const tierColor =
    knightTier === "GOLD" ? "#f59e0b"
    : knightTier === "SILVER" ? "#94a3b8"
    : knightTier === "BRONZE" ? "#f97316"
    : "#71717a";

  const badgeBlock = knightLabel
    ? `
    <div style="text-align:center;margin:8px 0 24px;">
      <div style="display:inline-block;border:1px solid ${tierColor}55;background:${tierColor}14;border-radius:14px;padding:18px 28px;">
        <span style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#71717a;">Badge earned</span>
        <span style="display:block;font-size:20px;font-weight:700;color:${tierColor};margin-top:6px;">${knightLabel}</span>
      </div>
    </div>
    <p style="text-align:center;">${knightBlurb ?? ""}</p>`
    : `<p>You started the operation but did not score on any phase, so no badge was issued this time. The full debrief is still on your result card — it walks through the intrusion end to end.</p>`;

  const html = wrap(`
    <h1>Operation Zero Hour — results are in</h1>
    <p>Hi ${name},</p>
    ${badgeBlock}
    <div style="text-align:center;margin:24px 0;">
      <span class="stat">
        <span class="stat-val">${score}<span style="font-size:14px;color:#52525b;">/${maxScore}</span></span>
        <span class="stat-label">Score</span>
      </span>
      <span class="stat">
        <span class="stat-val">${rank ? `#${rank}` : "—"}</span>
        <span class="stat-label">${rank ? `of ${fieldSize}` : "Unranked"}</span>
      </span>
    </div>
    <p>Your result card breaks the run down phase by phase — what you got right, what you missed, and the intrusion resolved in full so you can check your reasoning against what actually happened.</p>
    <a href="https://www.cybersagevault.uk/operations/zero-hour/result" class="btn">View your report card →</a>
    <a href="https://www.cybersagevault.uk/operations/zero-hour/leaderboard" style="display:inline-block;padding:12px 24px;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;font-size:14px;border-radius:10px;text-decoration:none;margin:4px 0 16px 8px;">Final leaderboard</a>
    <p style="font-size:12px;color:#52525b;">Thanks for standing the watch. — The Sage Vault team</p>
  `, "Operation Zero Hour results");

  await resend.emails.send({
    from: FROM,
    to,
    subject: knightLabel
      ? `Zero Hour results — you earned ${knightLabel}`
      : `Operation Zero Hour — your results`,
    html,
  });
}
