/**
 * Client-side environment registry.
 *
 * The server only ever sends a scenario's `environment` key and a flat list
 * of evidence `key`s — never a position, never what the object means. Where
 * each key actually sits in 3D space, and what it looks like, is entirely a
 * rendering concern and lives here. A second scenario that reuses the
 * "office-v1" environment with different evidence keys just needs its own
 * entry in this file — no schema change, matching the reasoning in
 * MissionScenario.environment's doc comment.
 */

export type ObjectAppearance = "screen" | "small" | "note" | "plant";

export type PlacedObject = {
  key: string;
  position: [number, number, number];
  appearance: ObjectAppearance;
};

export const ROOM_BOUNDS = { minX: -7.3, maxX: 7.3, minZ: -5.3, maxZ: 5.3 };

export const ENVIRONMENTS: Record<string, { objects: PlacedObject[] }> = {
  "office-v1": {
    objects: [
      { key: "laptop-login-log", position: [-5, 1, -3], appearance: "screen" },
      { key: "laptop-recent-file", position: [-5, 1, -1.6], appearance: "screen" },
      { key: "usb-under-desk", position: [-5, 0.25, -3.9], appearance: "small" },
      { key: "badge-reader-log", position: [5.2, 1.2, -3], appearance: "screen" },
      { key: "usb-holiday-photos", position: [3, 0.85, 3], appearance: "small" },
      { key: "sticky-note-meeting", position: [-2, 1.05, 2.1], appearance: "note" },
      { key: "desk-plant", position: [0, 0.5, 4.2], appearance: "plant" },
    ],
  },
};
