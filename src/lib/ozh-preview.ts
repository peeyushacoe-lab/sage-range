/**
 * Operation Zero Hour — preview access.
 *
 * The competition window is fixed and announced, so the organisers cannot walk
 * the console before it opens without moving the date for everyone. This
 * allowlist is the way in: named accounts can start early, and their runs are
 * marked so they never reach the real leaderboard.
 *
 * Configured by environment variable rather than code, so adding a reviewer
 * does not require a deploy:
 *
 *   OZH_PREVIEW_EMAILS="peeyush@cybersage.uk, someone.else@example.com"
 *
 * Two properties matter and are tested:
 *
 *   1. An empty or absent variable grants nobody access. A misconfigured
 *      deploy must fail closed, not open the competition to everyone.
 *   2. Matching is case- and whitespace-insensitive, because an email typed
 *      into a dashboard field will not always match the stored casing.
 */

export const OZH_PREVIEW_ENV = "OZH_PREVIEW_EMAILS";

/** Parse the allowlist. Blank entries are dropped rather than matching "". */
export function parsePreviewEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));
}

export function isPreviewer(
  email: string | null | undefined,
  raw: string | undefined = process.env[OZH_PREVIEW_ENV],
): boolean {
  if (!email) return false;
  return parsePreviewEmails(raw).includes(email.trim().toLowerCase());
}
