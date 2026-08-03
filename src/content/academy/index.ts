/**
 * Academy lesson content registry.
 *
 * Each course here supplies the ordered blocks that make a lesson readable.
 * A lesson with no blocks renders as a bare title, which is what an empty
 * course looks like to a learner — so scripts/seed-academy-content.ts reports
 * any lesson it leaves without content.
 */

import type { Course } from "./blocks";
import { NETWORK_SECURITY } from "./network-security";
import { CLOUD_SECURITY } from "./cloud-security";
import { FORENSICS } from "./forensics";
import { DETECTION_ENGINEERING } from "./detection-engineering";
import { CRYPTOGRAPHY } from "./cryptography";
import { THREAT_INTELLIGENCE } from "./threat-intelligence";

export const ACADEMY_CONTENT: Course[] = [
  NETWORK_SECURITY,
  CLOUD_SECURITY,
  FORENSICS,
  DETECTION_ENGINEERING,
  CRYPTOGRAPHY,
  THREAT_INTELLIGENCE,
];

export * from "./blocks";
export { FLASHCARDS, type CardSeed } from "./flashcards";
