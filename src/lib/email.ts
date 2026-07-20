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
    <p style="font-size:12px;color:#52525b;">You received this email because you have an account on Sage Vault. <a href="https://cybersage.uk" style="color:#71717a;">cybersage.uk</a></p>
  </div>
  <div class="footer">© 2026 Sage Vault · <a href="https://cybersage.uk/legal/privacy" style="color:#52525b;">Privacy</a> · <a href="https://cybersage.uk/legal/terms" style="color:#52525b;">Terms</a></div>
</div>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string, role: string) {
  if (!resend) return;

  const roleLabel = role === "INSTRUCTOR" ? "instructor" : role === "RECRUITER" ? "recruiter" : "student";
  const ctaHref = role === "INSTRUCTOR" ? "https://cybersage.uk/classroom"
    : role === "RECRUITER" ? "https://cybersage.uk/recruiter"
    : "https://cybersage.uk/labs";
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
    <a href="https://cybersage.uk/classroom/${classroomId}" class="btn">Go to classroom →</a>
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
    <a href="https://cybersage.uk/simulation/${sessionId}/certificate" class="btn">Download certificate →</a>
    <a href="https://cybersage.uk/simulation/${sessionId}/debrief" style="display:inline-block;padding:12px 24px;border:1px solid rgba(255,255,255,0.15);color:#a1a1aa;font-size:14px;border-radius:10px;text-decoration:none;margin:4px 0 16px 8px;">View debrief</a>
    <p style="font-size:12px;color:#52525b;">
      Verification URL: https://cybersage.uk/verify/simulation/${sessionId}
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
    <a href="https://cybersage.uk/classroom/${classroomId}" class="btn">Go to classroom →</a>
  `, "New lab assigned");

  await resend.emails.send({
    from: FROM,
    to,
    subject: `New lab assigned: ${labTitle}`,
    html,
  });
}
