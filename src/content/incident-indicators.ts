/**
 * Per-incident indicator derivation for the attack chains.
 *
 * The catalogue pairs ten authored chains against seven company environments,
 * so a single chain — ransomware, for one — becomes five separate incidents.
 * When the indicators inside a chain were constants, those five incidents
 * shared one answer key: solving St. Agnes solved Harrow, BrightCart,
 * Lakeshore and Ironforge too, for 7,000 points of nothing. Everything
 * arbitrary is therefore derived from (chain key, company domain) here.
 *
 * What is derived: filenames, hostnames, accounts, C2 addresses, scheduled
 * task and service names, volumes, hashes, counts. What is deliberately NOT
 * derived: real-world names the learner is meant to recognise — vssadmin.exe,
 * NTDS.dit, DCSync, StopLogging. Randomising those would test nothing, and a
 * chain whose every answer is generated is a lookup exercise rather than an
 * investigation.
 *
 * Derivation is pure. artifacts() and tasks() are separate closures invoked at
 * different times by the seed script, and they agree on every indicator
 * without sharing state precisely because neither of them stores anything.
 */

export type ChainContext = {
  company: string;
  domain: string;
  /** Sector-flavoured asset name, e.g. "PACS imaging server". */
  crownJewel: string;
  user: string;
  host: string;
};

/**
 * FNV-1a — short, dependency-free, and stable across Node versions. Nothing
 * here is security-sensitive; the only property that matters is that the same
 * seed yields the same indicator in the seed script and in the answer checker.
 */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Documentation and benchmarking ranges only (RFC 5737, RFC 2544).
 *
 * The constants these replaced included addresses like 45.87.212.9 that route
 * to somebody's real host. A training platform teaching people to block and
 * report indicators should not print live ones.
 */
const IP_PREFIXES = [
  "192.0.2",
  "198.51.100",
  "203.0.113",
  "198.18.7",
  "198.18.22",
  "198.18.41",
  "198.18.90",
  "198.19.14",
] as const;

const C2_WORDS = [
  "cdn-telemetry",
  "sys-relay",
  "edge-metrics",
  "cloud-sync",
  "net-monitor",
  "api-gateway",
  "static-assets",
  "update-broker",
  "log-shipper",
  "asset-cache",
  "dns-resolver",
  "mail-transit",
] as const;

// Kept disjoint from C2_WORDS so the pair never reads "sys-relay-relay".
const C2_TAILS = ["gateway", "bridge", "proxy", "stream", "portal", "direct", "link"] as const;
// Digits are common enough in real C2 infrastructure to be plausible, and they
// widen the domain space by an order of magnitude — which is what keeps two
// companies paired with the same chain from being handed the same C2 domain.
const C2_SUFFIXES = ["", "", "", "01", "02", "1", "7", "24", "x", "hq"] as const;
const TLDS = ["net", "org", "io", "co", "info", "biz", "su"] as const;

/** Thousands separators without depending on ICU locale data. */
export function commas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type Seeder = {
  pick: <T>(field: string, choices: readonly T[]) => T;
  int: (field: string, min: number, max: number) => number;
  /** One decimal place, e.g. "4.2". */
  dec: (field: string, min: number, max: number) => string;
  hex: (field: string, length: number) => string;
  ip: (field: string) => string;
  domain: (field: string) => string;
};

/**
 * A per-incident source of stable pseudo-random values.
 *
 * Each field is salted with its own name rather than drawn in sequence from a
 * PRNG. That costs nothing and buys the property that matters for authored
 * content: adding an indicator to one chain cannot shift the values of any
 * other, so extending a scenario never silently invalidates answers players
 * have already been given.
 */
function seedFor(chainKey: string, c: ChainContext): Seeder {
  // Keyed on the domain rather than the label: it is the stable identifier in
  // the catalogue, and no two company environments can share one.
  const base = `${chainKey}:${c.domain}`;
  const at = (field: string, salt = 0) => fnv1a(`${base}:${field}:${salt}`);

  const pick = <T,>(field: string, choices: readonly T[]): T =>
    choices[at(field) % choices.length];

  return {
    pick,
    int: (field, min, max) => min + (at(field) % (max - min + 1)),
    dec: (field, min, max) =>
      (min + (at(field) % (Math.round((max - min) * 10) + 1)) / 10).toFixed(1),
    hex: (field, length) => {
      let out = "";
      for (let i = 0; out.length < length; i++) {
        out += at(field, i).toString(16).padStart(8, "0");
      }
      return out.slice(0, length);
    },
    ip: (field) => `${IP_PREFIXES[at(field) % IP_PREFIXES.length]}.${1 + (at(field, 1) % 253)}`,
    domain: (field) =>
      `${pick(`${field}-w`, C2_WORDS)}-${pick(`${field}-t`, C2_TAILS)}${pick(`${field}-s`, C2_SUFFIXES)}.${pick(`${field}-d`, TLDS)}`,
  };
}

/** "PACS imaging server" -> "/pacs-imaging-server". */
function assetPath(crownJewel: string): string {
  return (
    "/" +
    crownJewel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}

/** "stagnes-health.uk" -> "stagneshealth", for package scopes and repo names. */
function orgToken(domain: string): string {
  return domain.split(".")[0].replace(/[^a-z0-9]/g, "");
}

// ── Per-chain indicator sets ─────────────────────────────────────────────────
// One builder per chain, called by both artifacts() and tasks().

export function ransomwareIndicators(c: ChainContext) {
  const s = seedFor("ransomware", c);
  const invoiceRef = s.int("invoiceRef", 1000, 9899);
  const exfilMb = s.int("exfilMb", 90, 460);
  return {
    c2Ip: s.ip("c2"),
    c2Domain: s.domain("c2"),
    senderDomain: `${s.pick("sender", ["supplier-billing", "invoice-portal", "accounts-payable", "billing-desk", "vendor-invoices"])}.${s.pick("senderTld", TLDS)}`,
    invoiceRef,
    invoiceFile: `Invoice_${invoiceRef}.docm`,
    droppedBinary: `${s.pick("dropped", ["svchost_helper", "winlogon_svc", "spoolsv_update", "taskhostw_cache", "conhost_aux"])}.exe`,
    serviceAccount: `svc-${s.pick("svcAcct", ["backup", "monitor", "deploy", "report", "archive"])}`,
    schedTask: s.pick("schedTask", [
      "SystemHealthCheck",
      "WindowsUpdateAudit",
      "DiskMaintenance",
      "TelemetrySync",
      "SecurityScanTask",
      "NetworkDiagnostic",
    ]),
    serviceName: s.pick("service", [
      "WinDefendUpdate",
      "MsSecSvcHost",
      "WinTelemetrySvc",
      "DefenderCacheSvc",
      "SysHealthAgent",
    ]),
    ransomExt: s.pick("ext", ["lockbit3", "blackcat", "cl0p", "phobos", "royal", "akira"]),
    ransomNote: s.pick("note", [
      "README_RESTORE.txt",
      "HOW_TO_DECRYPT.txt",
      "RESTORE_FILES.txt",
      "RECOVER_YOUR_DATA.txt",
    ]),
    noteDirs: commas(s.int("noteDirs", 1200, 6400)),
    exfilMb,
    exfilBytes: commas(exfilMb * 1_000_000 + s.int("exfilJitter", 0, 900_000)),
    exfilHours: s.int("exfilHours", 6, 16),
    exfilSessions: commas(s.int("exfilSessions", 180, 640)),
  };
}

export function becIndicators(c: ChainContext) {
  const s = seedFor("bec", c);
  const amount = s.int("amount", 182, 964) * 100;
  return {
    attackerIp: s.ip("attacker"),
    localIp: s.ip("local"),
    fwdDomain: s.domain("fwd"),
    fwdLocalPart: s.pick("fwdLocal", [
      "accounts.recovery",
      "billing.updates",
      "invoice.desk",
      "finance.sync",
      "remittance.team",
    ]),
    // All three are legacy protocols that bypass a modern MFA challenge, so
    // the answer varies without the underlying lesson changing.
    legacyProtocol: s.pick("protocol", ["IMAP4", "POP3", "SMTP AUTH"]),
    remoteCity: s.pick("remoteCity", [
      "Lagos, NG",
      "Manila, PH",
      "Kyiv, UA",
      "Accra, GH",
      "Hanoi, VN",
    ]),
    localCity: s.pick("localCity", ["Leeds, UK", "Bristol, UK", "Cardiff, UK", "Glasgow, UK"]),
    ruleFolder: s.pick("ruleFolder", [
      "RSS Feeds",
      "Conversation History",
      "Notes",
      "Junk Email",
      "Sync Issues",
    ]),
    amount,
    amountText: `£${commas(amount)}`,
    invoiceRef: s.int("invoiceRef", 10_000, 99_899),
    sortCode: `${s.int("sc1", 10, 89)}-${s.int("sc2", 10, 89)}-${s.int("sc3", 10, 89)}`,
    accountNo: `${s.int("acct", 10_000_000, 99_899_999)}`,
  };
}

export function webshellIndicators(c: ChainContext) {
  const s = seedFor("webshell", c);
  const month = String(s.int("month", 3, 10)).padStart(2, "0");
  const day = String(s.int("day", 1, 27)).padStart(2, "0");
  const apiWord = s.pick("shellWord", ["img", "thumb", "logo", "banner", "icon", "asset"]);
  return {
    attackerIp: s.ip("attacker"),
    c2Domain: s.domain("c2"),
    webHost: s.pick("webHost", ["web01", "www-prod-01", "edge01", "pub-web-02"]),
    shellFile: `${apiWord}_2026${month}${day}.php`,
    secondShell: `.${s.pick("second", ["cache", "session", "config", "temp"])}.php`,
    uploadEndpoint: s.pick("upload", [
      "/upload.php",
      "/media/upload.php",
      "/admin/fileupload.php",
      "/api/upload.php",
      "/cms/attach.php",
    ]),
    rootAccount: s.pick("rootAcct", ["svcweb", "wwwsvc", "apache2d", "webadmin", "httpdsvc"]),
    dbIp: `10.${s.int("dbA", 10, 90)}.${s.int("dbB", 1, 40)}.${s.int("dbC", 10, 90)}`,
    date: `${day}/${["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][s.int("month", 3, 10) - 3]}/2026`,
  };
}

export function cloudIndicators(c: ChainContext) {
  const s = seedFor("cloud", c);
  const objects = s.int("objects", 4_100, 26_400);
  return {
    attackerIp: s.ip("attacker"),
    accessKeyId: `AKIA${s.hex("key", 12).toUpperCase()}`,
    leakedRole: s.pick("role", ["ci-deploy", "build-runner", "tf-apply", "release-bot"]),
    iamUser: s.pick("iamUser", [
      "svc-monitoring",
      "svc-metrics",
      "ci-runner-2",
      "ops-telemetry",
      "backup-agent",
    ]),
    trailName: s.pick("trail", [
      "org-audit-trail",
      "central-cloudtrail",
      "sec-audit-trail",
      "platform-trail",
    ]),
    homeRegion: s.pick("home", ["eu-west-2", "eu-west-1", "eu-central-1"]),
    quietRegion: s.pick("quiet", ["ap-south-1", "sa-east-1", "me-south-1", "af-south-1"]),
    objects,
    objectsText: commas(objects),
    instanceCount: s.int("instances", 8, 40),
    instanceType: s.pick("instanceType", ["g5.xlarge", "p3.2xlarge", "g4dn.4xlarge"]),
    keyAgeDays: s.int("keyAge", 180, 780),
    repo: `${orgToken(c.domain)}/${s.pick("repo", ["deploy-scripts", "infra-pipelines", "platform-ci", "release-tools"])}`,
  };
}

export function insiderIndicators(c: ChainContext) {
  const s = seedFor("insider", c);
  const root = assetPath(c.crownJewel);
  const transfers = s.int("transfers", 3, 6);
  // First and last are fixed so the story holds however many transfers there
  // are: the pattern always starts five weeks out and always ends after the
  // 22 July resignation, which is what the premeditation question turns on.
  const dates = ["20 Jun", ...["28 Jun", "04 Jul", "11 Jul", "18 Jul"].slice(0, transfers - 2), "31 Jul"];
  const isoDates = [
    "2026-06-20",
    ...["2026-06-28", "2026-07-04", "2026-07-11", "2026-07-18"].slice(0, transfers - 2),
    "2026-07-31",
  ];
  const finalVolume = s.dec("finalVol", 3.0, 5.6);
  // The final transfer's contents have to add up to the volume the DLP log
  // reports for it, or an attentive learner is reading two contradictory
  // artifacts.
  const finalSplitA = ((Number(finalVolume) - 0.3) * 0.55).toFixed(1);
  return {
    storageDomain: `${s.pick("storage", ["personal-drive-sync", "myfiles-cloud", "quickshare-box", "homevault-sync"])}.${s.pick("storageTld", TLDS)}`,
    transfers,
    dates,
    isoDates,
    // Earlier transfers ramp up; the final one is always the largest, which is
    // what makes the premeditation timeline readable.
    volumes: dates.slice(0, -1).map((_, i) => s.dec(`vol${i}`, 0.4, 2.4)),
    finalVolume,
    finalSplitA,
    finalSplitB: (Number(finalVolume) - 0.3 - Number(finalSplitA)).toFixed(1),
    hrFolder: `/hr/${s.pick("hrArea", ["compensation", "payroll", "appraisals", "bonus", "reward", "benefits"])}/2026-${s.pick("hrPeriod", ["review", "q2", "cycle", "plan", "annual", "moderation"])}/`,
    sourceRoot: root,
    sourceA: `${root}/current/`,
    sourceB: `${root}/archive/`,
    mappedDrive: `${s.pick("drive", ["M", "N", "P", "S"])}:${root.replace(/\//g, "\\")}`,
    staffCount: s.int("staff", 24, 180),
    usbDevice: s.pick("usb", [
      "SanDisk Ultra 128GB",
      "Kingston DataTraveler 64GB",
      "Samsung BAR Plus 256GB",
      "Verbatim Store and Go 32GB",
    ]),
    resignationDate: "2026-07-22",
  };
}

export function adIndicators(c: ChainContext) {
  const s = seedFor("ad", c);
  return {
    c2Ip: s.ip("c2"),
    c2Domain: s.domain("c2"),
    dcName: s.pick("dc", ["DC-01", "DC-CORE-01", "DC-HQ-02", "DC-PRIMARY"]),
    ticketYears: s.int("ticketYears", 5, 15),
    // Composed rather than picked from a short list: four companies pair with
    // this chain, and this is the only answer here that varies — a five-item
    // list collides often enough to hand two of them the same key.
    dsaValue: `${s.pick("dsaPrefix", ["Dsa", "Ntds", "Dir", "Ds"])}${s.pick("dsaCore", ["Patch", "Filter", "Extension", "Helper", "Cache", "Hook", "Proxy"])}${s.pick("dsaSuffix", ["", "Svc", "32", "Ex"])}`,
    dsaDll: `${s.pick("dsaDll", ["ntdsutil_hlp", "dsrole_svc", "adsi_cache", "lsasrv_ext", "ntds_bak"])}.dll`,
    runValue: s.pick("runValue", ["WinUpd", "SysHost", "NetCfgSvc", "UpdOrchestrator"]),
    runDll: `${s.pick("runDll", ["wu", "netcfg", "shsvc", "updorch"])}.dll`,
    ntdsSize: s.dec("ntdsSize", 0.8, 2.6),
  };
}

export function supplyIndicators(c: ChainContext) {
  const s = seedFor("supply", c);
  const scope = `@${orgToken(c.domain)}`;
  const cleanHash = s.hex("clean", 64);
  return {
    c2Ip: s.ip("c2"),
    c2Domain: s.domain("c2"),
    payloadFile: s.pick("payload", ["opt.js", "min.js", "post.js", "bundle-opt.js"]),
    buildStep: s.pick("buildStep", [
      "post-build-optimise",
      "asset-minify",
      "bundle-postprocess",
      "dist-compress",
      "release-repack",
    ]),
    release: `2.${s.int("minor", 2, 14)}.0`,
    scope,
    hijackedPkg: `${scope}/${s.pick("hijacked", ["telemetry", "auth-client", "logger", "config-loader", "metrics"])}`,
    safePkg: `${scope}/${s.pick("safe", ["ui-kit", "design-tokens", "icons", "forms"])}`,
    internalVersion: `1.${s.int("intMinor", 1, 9)}.${s.int("intPatch", 0, 9)}`,
    cleanHash,
    cleanHashShort: cleanHash.slice(0, 8),
    publishedHash: s.hex("published", 64),
    cleanBytes: s.int("cleanBytes", 1_400_000, 2_400_000),
    commit: s.hex("commit", 7),
    packageCount: commas(s.int("packages", 640, 1_840)),
  };
}

export function otIndicators(c: ChainContext) {
  const s = seedFor("ot", c);
  const setpointOld = s.int("setpointOld", 60, 88);
  return {
    attackerIp: s.ip("attacker"),
    vendorAccount: s.pick("vendorAcct", [
      "vendor-support",
      "oem-service",
      "siteservices",
      "plc-vendor",
      "integrator-svc",
    ]),
    remoteTool: s.pick("tool", ["TeamViewer", "AnyDesk", "VNC", "LogMeIn"]),
    jumpHost: s.pick("jump", ["ENG-JUMP-01", "OT-GW-02", "PLANT-JMP-01", "ENG-BRIDGE-01"]),
    otVlan: `172.16.${s.int("vlan", 20, 90)}.0/24`,
    otPrefix: `172.16.${s.int("vlan", 20, 90)}`,
    plcOctet: s.int("plc", 40, 90),
    hmiOctet: s.int("hmi", 10, 38),
    tag: s.pick("tag", ["TT-401", "PT-220", "FT-118", "LT-330", "TT-512"]),
    setpointOld: `${setpointOld}.0`,
    setpointNew: `${setpointOld + s.int("setpointDelta", 9, 22)}.0`,
    alarmOld: `${setpointOld + 8}.0`,
    alarmNew: `${setpointOld + s.int("setpointDelta", 9, 22) + s.int("alarmDelta", 6, 14)}.0`,
    firmware: `${s.int("fwMajor", 3, 6)}.${s.int("fwMinor", 0, 9)}.${s.int("fwPatch", 0, 9)}`,
    passwordYear: s.int("pwYear", 2019, 2023),
  };
}

export function stuffingIndicators(c: ChainContext) {
  const s = seedFor("stuffing", c);
  const apiBase = s.pick("apiBase", [
    "/api/v1",
    "/api/v2",
    "/api/v3",
    "/api",
    "/auth",
    "/auth/v1",
    "/api/public",
    "/gateway/v1",
  ]);
  const loginVerb = s.pick("loginVerb", ["login", "signin", "session", "authenticate", "token"]);
  const attempts = s.int("attempts", 840_000, 1_940_000);
  const successes = s.int("successes", 1_800, 6_400);
  return {
    attackerIp: s.ip("attacker"),
    scrapeDomain: s.domain("scrape"),
    apiBase,
    loginPath: `${apiBase}/${loginVerb}`,
    accountPath: `${apiBase}/account`,
    emailPath: `${apiBase}/account/email`,
    attempts: commas(attempts),
    usernames: commas(Math.round(attempts * 0.82)),
    sourceIps: commas(s.int("sourceIps", 4_200, 12_800)),
    successes: commas(successes),
    successRate: ((successes / attempts) * 100).toFixed(2),
    userAgents: commas(s.int("userAgents", 6_400, 18_200)),
    baseline: commas(s.int("baseline", 22_000, 68_000)),
    takeoverAction: s.pick("action", [
      "Changed email address",
      "Changed the registered phone number",
      "Disabled login notifications",
      "Changed the delivery address",
      "Removed the recovery contact",
      "Changed the account password",
    ]),
    accounts: [
      `customer-${s.int("cust1", 10_000, 99_899)}`,
      `customer-${s.int("cust2", 10_000, 99_899)}`,
      `customer-${s.int("cust3", 10_000, 99_899)}`,
    ],
  };
}

/**
 * Reflection vectors for the DDoS chain.
 *
 * The technique question is the one knowledge answer here, so the vector
 * itself is what varies — the ratios are the real-world figures for each
 * protocol, which is what makes the question answerable from the evidence.
 */
const REFLECTORS = [
  { name: "NTP amplification / reflection", port: "UDP/123", proto: "NTP", ratio: 206 },
  { name: "DNS amplification / reflection", port: "UDP/53", proto: "DNS", ratio: 54 },
  { name: "memcached amplification / reflection", port: "UDP/11211", proto: "memcached", ratio: 9400 },
  { name: "CLDAP amplification / reflection", port: "UDP/389", proto: "CLDAP", ratio: 62 },
] as const;

export function ddosIndicators(c: ChainContext) {
  const s = seedFor("ddos", c);
  const reflector = s.pick("reflector", REFLECTORS);
  const secondary = REFLECTORS[(REFLECTORS.indexOf(reflector) + 1) % REFLECTORS.length];
  return {
    attackerIp: s.ip("attacker"),
    extortionDomain: s.domain("extortion"),
    reflector,
    secondary,
    reflectorNames: REFLECTORS.map((r) => r.name),
    peakGbps: s.int("peak", 90, 640),
    durationMin: s.int("duration", 18, 74),
    sources: commas(s.int("sources", 8_400, 42_000)),
    baseline: s.dec("baseline", 0.6, 3.4),
    ransomBtc: s.int("btc", 4, 22),
    probeCount: commas(s.int("probes", 400, 2_400)),
    probeDays: s.int("probeDays", 4, 11),
  };
}
