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
import { CYBER_FUNDAMENTALS } from "./cyber-fundamentals";
import { SOC_ANALYST } from "./soc-analyst";
import { WEB_SECURITY } from "./web-security";
import { LINUX_SECURITY } from "./linux-security";

export const ACADEMY_CONTENT: Course[] = [
  // The four foundational courses, brought up to the standard of the rest.
  CYBER_FUNDAMENTALS,
  SOC_ANALYST,
  WEB_SECURITY,
  LINUX_SECURITY,
  // The six specialist courses authored to this standard from the start.
  NETWORK_SECURITY,
  CLOUD_SECURITY,
  FORENSICS,
  DETECTION_ENGINEERING,
  CRYPTOGRAPHY,
  THREAT_INTELLIGENCE,
];

export * from "./blocks";
export { FLASHCARDS, type CardSeed } from "./flashcards";
