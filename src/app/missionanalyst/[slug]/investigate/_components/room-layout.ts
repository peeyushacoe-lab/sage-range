/**
 * Client-side environment registry — 2D version.
 *
 * The server only ever sends a scenario's `environment` key and a flat list
 * of evidence `key`s — never a position, never what the object means. Where
 * each key sits on screen, and what it looks like, is purely a rendering
 * concern and lives here. A second scenario reusing "office-v1" with
 * different evidence keys just needs its own entry — no schema change.
 *
 * Positions are percentages of the room illustration (top/left), not 3D
 * coordinates — this replaced an earlier first-person 3D build that hit an
 * unresolved react-reconciler/Turbopack production crash under time
 * pressure. Same evidence system underneath either way.
 */

export type ObjectAppearance = "screen" | "small" | "note" | "plant";

export type PlacedObject = {
  key: string;
  top: number; // percentage, 0-100
  left: number; // percentage, 0-100
  appearance: ObjectAppearance;
};

export const ENVIRONMENTS: Record<string, { objects: PlacedObject[] }> = {
  // All three scenarios below share this one visual room (it's the same
  // office, different nights) — their evidence keys never collide, and only
  // the active scenario's own keys ever render, so this list is a superset,
  // not a per-scenario duplicate.
  "office-v1": {
    objects: [
      // IR-001 — The Insider
      { key: "laptop-login-log", top: 38, left: 16, appearance: "screen" },
      { key: "laptop-recent-file", top: 38, left: 24, appearance: "screen" },
      { key: "usb-under-desk", top: 58, left: 18, appearance: "small" },
      { key: "badge-reader-log", top: 30, left: 82, appearance: "screen" },
      { key: "usb-holiday-photos", top: 62, left: 68, appearance: "small" },
      { key: "sticky-note-meeting", top: 44, left: 50, appearance: "note" },
      { key: "desk-plant", top: 70, left: 50, appearance: "plant" },

      // IR-002 — Night Shift Ransomware
      { key: "ws-quarantine-alert", top: 34, left: 14, appearance: "screen" },
      { key: "phishing-attachment", top: 40, left: 40, appearance: "screen" },
      { key: "network-spread-log", top: 30, left: 82, appearance: "screen" },
      { key: "backup-snapshot", top: 60, left: 62, appearance: "screen" },
      { key: "printer-error", top: 66, left: 28, appearance: "small" },
      { key: "helpdesk-ticket", top: 46, left: 50, appearance: "note" },
      { key: "coffee-machine-log", top: 74, left: 50, appearance: "small" },

      // IR-003 — Phishing → Account Compromise
      { key: "phishing-email", top: 38, left: 16, appearance: "screen" },
      { key: "login-anomaly", top: 30, left: 82, appearance: "screen" },
      { key: "mailbox-rule", top: 40, left: 40, appearance: "screen" },
      { key: "vendor-email-change", top: 58, left: 62, appearance: "screen" },
      { key: "password-reset-log", top: 62, left: 18, appearance: "small" },
      { key: "vpn-log-normal", top: 46, left: 50, appearance: "note" },
      { key: "parking-note", top: 72, left: 50, appearance: "small" },
    ],
  },
};
