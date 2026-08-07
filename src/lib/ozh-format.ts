/**
 * Display helpers for Operation Zero Hour.
 *
 * The competition is scheduled in IST and stored in UTC. Every time the
 * interns see is rendered through here so the deadline reads as the 8 PM they
 * were told, on their machine and on the organiser's, regardless of where
 * either is running.
 */

export const OZH_TIMEZONE = "Asia/Kolkata";

export function formatIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: OZH_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatISTTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: OZH_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** HH:MM:SS, for the run countdown. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

/** "2h 41m 17s", for elapsed time on the result page. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Countdown tone: calm until the last half hour, then increasingly urgent. */
export function countdownTone(secondsRemaining: number): "emerald" | "amber" | "red" {
  if (secondsRemaining <= 5 * 60) return "red";
  if (secondsRemaining <= 30 * 60) return "amber";
  return "emerald";
}
