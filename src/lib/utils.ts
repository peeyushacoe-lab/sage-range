import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats a lesson-duration sum (minutes) into a human string, e.g. "1h 15m" / "45 min".
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 min";
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
