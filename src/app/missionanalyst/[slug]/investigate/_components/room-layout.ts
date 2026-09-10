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
  "office-v1": {
    objects: [
      { key: "laptop-login-log", top: 38, left: 16, appearance: "screen" },
      { key: "laptop-recent-file", top: 38, left: 24, appearance: "screen" },
      { key: "usb-under-desk", top: 58, left: 18, appearance: "small" },
      { key: "badge-reader-log", top: 30, left: 82, appearance: "screen" },
      { key: "usb-holiday-photos", top: 62, left: 68, appearance: "small" },
      { key: "sticky-note-meeting", top: 44, left: 50, appearance: "note" },
      { key: "desk-plant", top: 70, left: 50, appearance: "plant" },
    ],
  },
};
