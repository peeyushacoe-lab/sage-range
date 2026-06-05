import type { CompanyProfile, EmployeeProfile, Executive } from "../../types";

// ── Name pools ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "James", "Sarah", "Michael", "Emily", "David", "Jessica", "Robert", "Amanda",
  "William", "Melissa", "Richard", "Lauren", "John", "Stephanie", "Thomas", "Nicole",
  "Mark", "Ashley", "Daniel", "Jennifer", "Paul", "Rachel", "Andrew", "Megan",
  "Chris", "Samantha", "Kevin", "Laura", "Brian", "Heather",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Walker", "Clark", "Lewis", "Robinson", "Young",
];

// ── Industry archetypes ───────────────────────────────────────────────────────

interface Archetype {
  industry: string;
  companySuffixes: string[];
  companyPrefixes: string[];
  departments: string[];
  systems: string[];
  securityPosture: string;
  size: "Small" | "Medium" | "Large";
  cities: string[];
  executiveTitles: string[];
  defaultControls: string[];  // action IDs automatically blocked at start
}

const ARCHETYPES: Record<string, Archetype> = {
  FINANCIAL_SERVICES: {
    industry: "Financial Services",
    companyPrefixes: ["Meridian", "Nexus", "Sterling", "Apex", "Keystone", "Harbour", "Summit", "Orion"],
    companySuffixes: ["Capital", "Financial", "Banking Group", "Asset Management", "Wealth Partners", "Securities"],
    departments: ["Finance", "IT", "Security Operations", "Legal & Compliance", "HR", "Operations", "Risk Management"],
    systems: [
      "Active Directory", "Exchange Server", "Core Banking System",
      "Finance Database", "DLP System", "SIEM Platform", "Trading Platform", "Backup Server",
    ],
    securityPosture: "Strong — dedicated SOC, 24/7 monitoring, regulatory compliance frameworks in place.",
    size: "Large",
    cities: ["New York", "Chicago", "Boston", "San Francisco", "London"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: ["enable_mfa", "deploy_siem"],
  },

  HEALTHCARE: {
    industry: "Healthcare",
    companyPrefixes: ["Riverside", "Summit", "Lakeside", "Valley", "Greenfield", "Cedar", "Maple", "Heritage"],
    companySuffixes: ["Medical Center", "Health Network", "Healthcare System", "Regional Hospital", "Clinic Group"],
    departments: ["Clinical", "IT", "Administration", "Finance", "HR", "Nursing", "Pharmacy"],
    systems: [
      "EMR System", "Patient Database", "Active Directory", "Exchange Server",
      "Medical Device Network", "PACS Imaging System", "Backup Server", "Billing System",
    ],
    securityPosture: "Moderate — compliance-driven security but legacy systems and limited security budget create gaps.",
    size: "Large",
    cities: ["Houston", "Phoenix", "Philadelphia", "San Antonio", "Dallas", "Nashville"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: [],
  },

  STARTUP: {
    industry: "Technology Startup",
    companyPrefixes: ["Nova", "Flux", "Verve", "Cipher", "Loop", "Relay", "Axon", "Forge"],
    companySuffixes: ["Technologies", "Labs", "Systems", "Software", "Platform", "AI", "Cloud", "Inc."],
    departments: ["Engineering", "Product", "Operations", "Marketing", "Customer Success"],
    systems: [
      "AWS EC2", "GitHub Enterprise", "Slack", "Google Workspace",
      "PostgreSQL", "Redis Cache", "Kubernetes Cluster", "Stripe API",
    ],
    securityPosture: "Weak — no dedicated security staff, minimal controls, fast-moving culture prioritises features over security.",
    size: "Small",
    cities: ["San Francisco", "Austin", "Seattle", "Denver", "New York", "Miami"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: [],
  },

  GOVERNMENT: {
    industry: "Government",
    companyPrefixes: ["National", "Federal", "Central", "Regional", "Metropolitan", "State"],
    companySuffixes: ["Agency", "Department", "Authority", "Bureau", "Administration", "Office"],
    departments: ["IT Services", "Security", "Administration", "Finance", "Legal", "Operations", "Compliance"],
    systems: [
      "Active Directory", "SharePoint", "Exchange Server", "Document Management System",
      "VPN Gateway", "Legacy Application Server", "SIEM Platform", "Audit Log System",
    ],
    securityPosture: "Moderate — mandatory compliance frameworks followed but underfunded, mix of modern and legacy infrastructure.",
    size: "Medium",
    cities: ["Washington DC", "Sacramento", "Albany", "Atlanta", "Columbus", "Indianapolis"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: ["enable_mfa"],
  },

  RETAIL: {
    industry: "Retail",
    companyPrefixes: ["Apex", "Horizon", "Crest", "Pinnacle", "Metro", "Urban", "Coastal", "Central"],
    companySuffixes: ["Retail Group", "Commerce", "Stores", "Brands", "Markets", "Wholesale", "Distribution"],
    departments: ["IT", "Finance", "Operations", "HR", "Marketing", "Logistics", "Customer Service"],
    systems: [
      "POS System", "Customer Database", "E-Commerce Platform", "ERP System",
      "Active Directory", "Exchange Server", "Payment Processing Gateway", "Inventory Management",
    ],
    securityPosture: "Below average — PCI-DSS compliance present but security investment minimal, large attack surface from retail operations.",
    size: "Medium",
    cities: ["Los Angeles", "Chicago", "Dallas", "Phoenix", "Charlotte", "Minneapolis"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: [],
  },

  TECHNOLOGY: {
    industry: "Technology",
    companyPrefixes: ["Quantum", "Vector", "Nexus", "Prism", "Core", "Synapse", "Vertex", "Helix"],
    companySuffixes: ["Technologies", "Systems", "Software", "Solutions", "Networks", "Cloud", "Platforms"],
    departments: ["Engineering", "Security", "IT Operations", "Finance", "HR", "Sales", "DevOps"],
    systems: [
      "GitHub Enterprise", "AWS Infrastructure", "Jira & Confluence", "Active Directory",
      "Kubernetes Cluster", "PostgreSQL", "SIEM Platform", "Okta SSO",
    ],
    securityPosture: "Strong — security-aware culture, regular pen testing, but growing attack surface from rapid cloud expansion.",
    size: "Medium",
    cities: ["Seattle", "San Francisco", "Austin", "Boston", "Portland", "Raleigh"],
    executiveTitles: ["CEO", "CFO", "CISO", "LEGAL", "PR"],
    defaultControls: ["enable_mfa"],
  },
};

// ── Department → title pools ──────────────────────────────────────────────────

const TITLES_BY_DEPT: Record<string, string[]> = {
  "Engineering":        ["Software Engineer", "Senior Engineer", "Tech Lead", "Engineering Manager", "Backend Engineer"],
  "IT":                 ["IT Administrator", "Network Engineer", "Systems Administrator", "IT Director", "Help Desk Technician"],
  "IT Services":        ["IT Administrator", "Network Engineer", "Systems Administrator", "IT Director", "Help Desk Technician"],
  "IT Operations":      ["DevOps Engineer", "Systems Engineer", "Platform Engineer", "Cloud Administrator"],
  "Security":           ["Security Analyst", "SOC Analyst", "Security Engineer", "CISO", "Penetration Tester"],
  "Security Operations":["Security Analyst", "SOC Analyst", "Incident Responder", "Threat Intelligence Analyst"],
  "DevOps":             ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Cloud Architect"],
  "Finance":            ["Financial Analyst", "Controller", "Accountant", "CFO", "Finance Manager"],
  "HR":                 ["HR Manager", "Recruiter", "HR Director", "People Operations Manager", "HR Coordinator"],
  "Legal & Compliance": ["General Counsel", "Compliance Officer", "Legal Analyst", "Risk Manager"],
  "Legal":              ["General Counsel", "Compliance Officer", "Legal Analyst", "Risk Manager"],
  "Operations":         ["Operations Manager", "Business Analyst", "Project Manager", "Operations Coordinator"],
  "Marketing":          ["Marketing Manager", "Digital Marketing Specialist", "Content Strategist", "CMO"],
  "Clinical":           ["Clinical Administrator", "Department Head", "Clinical Coordinator"],
  "Nursing":            ["Head Nurse", "Nursing Manager", "Charge Nurse"],
  "Administration":     ["Office Manager", "Executive Assistant", "Administrative Director"],
  "Pharmacy":           ["Pharmacy Director", "Clinical Pharmacist", "Pharmacy Technician"],
  "Risk Management":    ["Risk Manager", "Chief Risk Officer", "Risk Analyst"],
  "Compliance":         ["Compliance Manager", "Audit Lead", "Compliance Analyst"],
  "Logistics":          ["Logistics Manager", "Supply Chain Analyst", "Warehouse Manager"],
  "Customer Service":   ["Customer Success Manager", "Support Lead", "Account Manager"],
  "Customer Success":   ["Customer Success Manager", "Support Engineer", "Account Executive"],
  "Product":            ["Product Manager", "Product Director", "UX Designer"],
  "Sales":              ["Sales Manager", "Account Executive", "VP Sales"],
};

const EMPLOYEE_TRAITS_BY_RISK: Record<"LOW" | "MEDIUM" | "HIGH", string[][]> = {
  HIGH: [
    ["domain admin access", "frequently works late"],
    ["admin credentials", "uses personal devices"],
    ["full system access", "bypasses MFA sometimes"],
    ["privileged account", "known to share credentials"],
  ],
  MEDIUM: [
    ["accesses sensitive data regularly", "moderate security training"],
    ["handles financial records", "works remotely"],
    ["customer data access", "aware of phishing risks"],
  ],
  LOW: [
    ["basic user access", "completed security training"],
    ["limited system access", "follows security policy"],
    ["read-only access", "good security hygiene"],
  ],
};

// ── Seeded PRNG (simple xorshift) ─────────────────────────────────────────────

function makeRng(seed: number) {
  let s = seed || Date.now();
  return {
    next(): number {
      s ^= s << 13;
      s ^= s >> 17;
      s ^= s << 5;
      return (s >>> 0) / 0xffffffff;
    },
    pick<T>(arr: T[]): T {
      return arr[Math.floor(this.next() * arr.length)];
    },
    int(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
  };
}

// ── Builder ───────────────────────────────────────────────────────────────────

function buildEmployees(
  departments: string[],
  count: number,
  rng: ReturnType<typeof makeRng>
): EmployeeProfile[] {
  const employees: EmployeeProfile[] = [];
  const usedNames = new Set<string>();

  // Ensure at least one employee per department
  for (const dept of departments) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const titles = TITLES_BY_DEPT[dept] ?? ["Manager", "Analyst", "Coordinator"];
    const title = rng.pick(titles);
    const isPrivileged = dept === "IT" || dept === "IT Services" || dept === "IT Operations" || dept === "Security" || dept === "Security Operations";
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" = isPrivileged ? "HIGH" : rng.next() < 0.25 ? "MEDIUM" : "LOW";
    employees.push({
      name,
      title,
      department: dept,
      riskLevel,
      traits: rng.pick(EMPLOYEE_TRAITS_BY_RISK[riskLevel]),
    });
  }

  // Fill remaining slots
  while (employees.length < count) {
    const dept = rng.pick(departments);
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const titles = TITLES_BY_DEPT[dept] ?? ["Manager", "Analyst", "Coordinator"];
    const title = rng.pick(titles);
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      rng.next() < 0.15 ? "HIGH" : rng.next() < 0.35 ? "MEDIUM" : "LOW";
    employees.push({
      name,
      title,
      department: dept,
      riskLevel,
      traits: rng.pick(EMPLOYEE_TRAITS_BY_RISK[riskLevel]),
    });
  }

  return employees;
}

function buildExecutives(
  archetype: Archetype,
  rng: ReturnType<typeof makeRng>
): Executive[] {
  const roles: Array<Executive["role"]> = ["CEO", "CFO", "CISO", "LEGAL", "PR"];
  return roles.map((role) => {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const titleMap: Record<Executive["role"], string> = {
      CEO: "Chief Executive Officer",
      CFO: "Chief Financial Officer",
      CISO: "Chief Information Security Officer",
      LEGAL: "General Counsel",
      PR: "Head of Communications",
    };
    const priorityMap: Record<Executive["role"], string> = {
      CEO: "Business continuity and shareholder confidence",
      CFO: "Minimise financial exposure and regulatory fines",
      CISO: "Contain breach, preserve evidence, restore operations",
      LEGAL: "Regulatory compliance and notification obligations",
      PR: "Protect brand reputation and manage media narrative",
    };
    const demandMap: Record<Executive["role"], string> = {
      CEO: "I need a full situation report and a recovery timeline within the hour.",
      CFO: "What is our financial exposure and have we triggered any disclosure requirements?",
      CISO: "Give me the full scope — what did they touch and how did they get in?",
      LEGAL: "We need to assess our regulatory notification obligations immediately.",
      PR: "Media are calling. I need approved talking points before we say anything public.",
    };
    return {
      name: `${first} ${last}`,
      title: titleMap[role],
      role,
      priority: priorityMap[role],
      satisfaction: 70,
      demand: demandMap[role],
    };
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export type IndustryArchetypeId = keyof typeof ARCHETYPES;

export function generateOrganization(
  archetypeId?: IndustryArchetypeId,
  seed?: number
): CompanyProfile {
  const rng = makeRng(seed ?? Date.now());
  const archetype =
    archetypeId && ARCHETYPES[archetypeId]
      ? ARCHETYPES[archetypeId]
      : rng.pick(Object.values(ARCHETYPES));

  const name = `${rng.pick(archetype.companyPrefixes)} ${rng.pick(archetype.companySuffixes)}`;
  const city = rng.pick(archetype.cities);
  const employeeCount =
    archetype.size === "Large"
      ? rng.int(80, 200)
      : archetype.size === "Medium"
      ? rng.int(30, 80)
      : rng.int(10, 30);

  const employees = buildEmployees(archetype.departments, employeeCount, rng);
  const executives = buildExecutives(archetype, rng);

  return {
    name,
    industry: archetype.industry,
    size: archetype.size,
    city,
    employees,
    systems: [...archetype.systems],
    securityPosture: archetype.securityPosture,
    executives,
  };
}

export function listArchetypes(): Array<{ id: string; industry: string; size: string }> {
  return Object.entries(ARCHETYPES).map(([id, a]) => ({
    id,
    industry: a.industry,
    size: a.size,
  }));
}
