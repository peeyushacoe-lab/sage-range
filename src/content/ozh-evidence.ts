/**
 * Operation Zero Hour — per-intern evidence derivation.
 *
 * Every intern investigates the *same* attack against Aegis Financial, but the
 * identifiers differ: usernames, hostnames, IPs, domains, filenames, hashes.
 * That is what makes "what's the C2 IP?" unanswerable by asking the person
 * next to you, while keeping one answer key shape and one difficulty level.
 *
 * Two rules hold this together:
 *
 *  1. Derivation is pure and seeded by userId alone. The evidence the console
 *     renders and the evidence the grader checks against are produced by the
 *     same call, so they cannot drift.
 *  2. Clock times are NOT varied. The narrative quotes them ("09:17"), and
 *     Phase 4 grades the *order* of events — varying times would change
 *     nothing about difficulty while making every artifact harder to author
 *     and every bug harder to reproduce.
 *
 * Field names are salted individually rather than drawn in sequence, so adding
 * an indicator later cannot shift the values of the ones already in use.
 */

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFor(seed: string) {
  let s = hash32(seed) || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Seeded picker/int/dec, each keyed by field name so fields are independent. */
function drawFor(seed: string) {
  const pick = <T>(field: string, options: readonly T[]): T =>
    options[Math.floor(rngFor(`${seed}:${field}`)() * options.length)];
  const int = (field: string, min: number, max: number): number =>
    min + Math.floor(rngFor(`${seed}:${field}`)() * (max - min + 1));
  return { pick, int };
}

const FIRST_INITIALS = ["m", "r", "a", "j", "s", "t", "k", "d", "n", "p"] as const;
const SURNAMES = [
  "williams", "patel", "okafor", "novak", "hartley", "mendes",
  "castellano", "brennan", "sorensen", "aliyev", "whitfield", "rahman",
] as const;
const FULL_FIRST = [
  "Maya", "Rohan", "Aisha", "Jonah", "Sofia", "Tomas",
  "Kiera", "Daniel", "Nadia", "Priya",
] as const;

/**
 * Attacker infrastructure uses RFC 5737 / RFC 2544 documentation ranges.
 * A training exercise that teaches interns to memorise and block a real
 * routable address is a liability, not a lesson.
 */
const DOC_PREFIXES = ["198.51.100", "203.0.113", "192.0.2", "198.18.4", "198.18.9"] as const;

const C2_WORDS = [
  "cdn-metrics", "vault-sync", "ledger-api", "trust-relay",
  "clearing-node", "swift-bridge", "audit-stream", "settle-edge",
] as const;
const C2_TAILS = ["gateway", "proxy", "portal", "direct", "transit", "channel"] as const;
const C2_TLDS = ["net", "org", "io", "co", "info", "biz"] as const;

/** Lookalikes of aegisfinancial.com — the tell the intern has to spot. */
const PHISH_SHAPES = [
  "aegisfinancia1.com", "aegis-financial.co", "aegisfinancial.co",
  "aegisfinanciai.com", "aegis-fjnancial.com", "aeglsfinancial.com",
] as const;

const DOC_STEMS = [
  "Q3_Reconciliation", "Vendor_Remittance", "Payment_Advice",
  "Audit_Schedule", "Settlement_Report", "Invoice_Batch",
] as const;

const STAGER_STEMS = [
  "onedrive_sync", "winupdate_host", "office_telemetry",
  "defender_cache", "spool_helper", "netsvc_host",
] as const;

const TASK_NAMES = [
  "OfficeTelemetryAgent", "WindowsHealthSync", "AdobeUpdateCheck",
  "EdgeUpdateTaskCore", "OneDriveReporting", "IntelGraphicsScan",
] as const;

/** Second persistence mechanism — the one most interns miss. */
const RUNKEY_NAMES = [
  "SecurityHealthSvc", "MicrosoftEdgeAutoLaunch", "OfficeClickToRun",
  "WindowsDefenderTray", "IntelDriverHelper", "AdobeARMHelper",
] as const;

const SVC_ACCOUNTS = [
  "svc-backup", "svc-sqlagent", "svc-fileidx", "svc-reporting",
  "svc-batchjob", "svc-archive",
] as const;

const ARCHIVE_STEMS = [
  "aegis_q3", "client_ledger", "loan_book", "kyc_export",
  "position_data", "recon_pack",
] as const;

export type OzhEvidence = {
  /** Compromised employee — the phishing recipient. */
  victimUser: string;
  victimFullName: string;
  victimEmail: string;
  /** Patient zero. */
  victimHost: string;
  /** C2 the beacon talks to. This is the answer to "attacker infrastructure". */
  c2Ip: string;
  c2Domain: string;
  c2Port: number;
  /**
   * Source of the VPN password spray. Deliberately a *different* address from
   * the C2: the spray is the loudest alert and the first one triaged, but it
   * never succeeded, so treating it as initial access is the trap this whole
   * scenario is built around.
   */
  sprayIp: string;
  sprayAttempts: number;
  /** The account the spray targeted — not the account that was compromised. */
  sprayTarget: string;
  phishDomain: string;
  phishSender: string;
  attachment: string;
  macroHash: string;
  stagerName: string;
  stagerPath: string;
  taskName: string;
  runKeyName: string;
  runKeyPath: string;
  svcAccount: string;
  fileServer: string;
  dbServer: string;
  dcHost: string;
  vpnGateway: string;
  archiveName: string;
  archivePath: string;
  archiveSizeMb: number;
  exfilMb: number;
  dnsQueryCount: number;
  recordCount: number;
};

/**
 * Derive one intern's evidence set.
 *
 * Seeded by userId so a run that is resumed, re-rendered or re-graded always
 * sees the same values — the console and the grader call this independently.
 */
export function deriveEvidence(userId: string): OzhEvidence {
  const seed = `ozh:aegis:${userId}`;
  const { pick, int } = drawFor(seed);

  const initial = pick("initial", FIRST_INITIALS);
  const surname = pick("surname", SURNAMES);
  const victimUser = `${initial}.${surname}`;
  const firstName = pick("firstName", FULL_FIRST);

  const c2Ip = `${pick("c2Prefix", DOC_PREFIXES)}.${int("c2Octet", 4, 250)}`;
  // Drawn from a different prefix pool position so the two attacker addresses
  // never read as neighbours on the same subnet.
  const sprayIp = `${pick("sprayPrefix", DOC_PREFIXES)}.${int("sprayOctet", 4, 250)}`;

  const hex = "0123456789abcdef";
  let macroHash = "";
  const hashRng = rngFor(`${seed}:macroHash`);
  for (let i = 0; i < 64; i++) macroHash += hex[Math.floor(hashRng() * 16)];

  const stager = pick("stager", STAGER_STEMS);
  const archiveName = `${pick("archive", ARCHIVE_STEMS)}.7z`;
  const runKeyName = pick("runKey", RUNKEY_NAMES);

  return {
    victimUser,
    victimFullName: `${firstName} ${surname.charAt(0).toUpperCase()}${surname.slice(1)}`,
    victimEmail: `${victimUser}@aegisfinancial.com`,
    victimHost: `WS-${String(int("victimHost", 12, 186)).padStart(3, "0")}`,
    c2Ip,
    c2Domain: `${pick("c2Word", C2_WORDS)}-${pick("c2Tail", C2_TAILS)}.${pick("c2Tld", C2_TLDS)}`,
    c2Port: pick("c2Port", [443, 8443, 8080, 9443]),
    sprayIp,
    sprayAttempts: int("sprayAttempts", 38, 96),
    // A plausible spray target that is not the victim — reinforcing that the
    // noisy alert and the real intrusion involve different accounts.
    sprayTarget: `${pick("sprayInitial", FIRST_INITIALS)}.${pick("spraySurname", SURNAMES)}`,
    phishDomain: pick("phishDomain", PHISH_SHAPES),
    phishSender: `accounts.payable@${pick("phishDomain", PHISH_SHAPES)}`,
    attachment: `${pick("docStem", DOC_STEMS)}_${int("docNum", 1000, 9999)}.xlsm`,
    macroHash,
    stagerName: `${stager}.exe`,
    stagerPath: `C:\\Users\\${victimUser}\\AppData\\Local\\Temp\\${stager}.exe`,
    taskName: pick("taskName", TASK_NAMES),
    runKeyName,
    runKeyPath: `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\${runKeyName}`,
    svcAccount: pick("svcAccount", SVC_ACCOUNTS),
    fileServer: `SRV-FS-${String(int("fileServer", 1, 9)).padStart(2, "0")}`,
    dbServer: `SRV-DB-${String(int("dbServer", 1, 9)).padStart(2, "0")}`,
    dcHost: `SRV-DC-${String(int("dcHost", 1, 4)).padStart(2, "0")}`,
    vpnGateway: `VPN-GW-${String(int("vpnGateway", 1, 3)).padStart(2, "0")}`,
    archiveName,
    archivePath: `C:\\Windows\\Temp\\${archiveName}`,
    archiveSizeMb: int("archiveSize", 340, 1180),
    exfilMb: int("exfilMb", 180, 640),
    dnsQueryCount: int("dnsQueries", 4200, 19400),
    recordCount: int("recordCount", 41000, 213000),
  };
}
