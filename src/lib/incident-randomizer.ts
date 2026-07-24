// Simulation Generator: deterministic per-(user, simulation) token
// substitution for "randomized" Incident Simulations.
//
// Authors write artifact/task content with {{TOKEN}} placeholders instead of
// hardcoded hostnames, IPs, domains, hashes, etc. At request time, both the
// page render (src/app/incidents/[slug]/page.tsx) and the answer-verification
// API route (src/app/api/incidents/submit/route.ts) call buildTokenMap with
// the SAME seed — so every student gets a stable, unique variant of the same
// investigation flow, and answer checking always agrees with what they saw.
//
// This is deliberately a fixed, hand-picked token set rather than a fully
// generic template engine — that keeps determinism trivial (every token is
// always generated, in the same order, regardless of which subset a given
// scenario actually uses) without needing per-scenario ordering logic.

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h;
}

const FIRST_NAMES = ["Diego", "Priya", "Marcus", "Elena", "Sam", "Yuki", "Omar", "Grace", "Liam", "Nadia", "Carlos", "Aisha"];
const LAST_NAMES = ["Martinez", "Chen", "Osei", "Ivanova", "Patel", "Kowalski", "Nguyen", "Reyes", "Novak", "Silva", "Whitfield", "Haddad"];
const DEPT_CODES = ["FIN", "OPS", "HR", "REC", "ADM", "CLN"];
const MALWARE_ADJECTIVES = ["Shadow", "Ghost", "Silent", "Crimson", "Obsidian", "Phantom", "Iron", "Void"];
const MALWARE_NOUNS = ["Locker", "Vault", "Reaper", "Cipher", "Wraith", "Sentinel"];
const DOMAIN_WORDS = ["cdn-update", "sys-relay", "cloud-sync", "net-monitor", "api-gateway", "edge-cache"];
const TLDS = ["net", "org", "io", "co"];
const LOOKALIKE_SUFFIXES = ["-support", "-secure", "-help", "-verify"];

export type TokenMap = Record<string, string>;

/**
 * Builds the full, fixed set of supported tokens for one (userId, simulationId)
 * pair. Always generates every token in the same order so results never shift
 * based on which tokens a particular scenario happens to reference.
 */
export function buildTokenMap(seedInput: string): TokenMap {
  const rng = mulberry32(hashSeed(seedInput));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const octet = () => Math.floor(rng() * 254) + 1;

  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const dept = pick(DEPT_CODES);
  const domainWord = pick(DOMAIN_WORDS);
  const tld = pick(TLDS);
  const lookalikeSuffix = pick(LOOKALIKE_SUFFIXES);
  const malwareName = `${pick(MALWARE_ADJECTIVES)}${pick(MALWARE_NOUNS)}`;
  const hashChars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) hash += hashChars[Math.floor(rng() * 16)];

  return {
    EMPLOYEE_NAME: `${firstName} ${lastName}`,
    EMPLOYEE_USER: `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`,
    PATIENT_ZERO_HOST: `${dept}-WKS-${100 + Math.floor(rng() * 900)}`,
    FILE_SERVER_HOST: `${dept}-FS-0${1 + Math.floor(rng() * 9)}`,
    ADMIN_ACCOUNT: `svc_${dept.toLowerCase()}admin`,
    C2_DOMAIN: `${domainWord}.${tld}`,
    C2_IP: `${octet()}.${octet()}.${octet()}.${octet()}`,
    LOOKALIKE_DOMAIN: `${dept.toLowerCase()}-corp${lookalikeSuffix}.com`,
    MALWARE_NAME: malwareName,
    MALWARE_HASH: hash,
  };
}

/** Substitutes every {{TOKEN}} occurrence in a string with its mapped value. */
export function applyTokens(input: string, tokens: TokenMap): string {
  return input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => tokens[key] ?? match);
}

/** Deterministic seed for a given user+simulation pair. */
export function simSeed(userId: string, simulationId: string): string {
  return `${userId}:${simulationId}`;
}
