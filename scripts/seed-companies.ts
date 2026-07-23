// Seeds the fictional CompanyEnvironments that Incident Simulations run inside.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-companies.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const COMPANIES = [
  {
    slug: "meridian-finance-group",
    name: "Meridian Finance Group",
    industry: "FINANCE" as const,
    description:
      "A regional bank holding company with ~1,200 employees across retail banking, wealth management, and back-office finance operations. Runs a hybrid on-prem/Azure environment with a legacy file-server-heavy Finance Department.",
    employeeCount: 1200,
    networkNotes:
      "Windows AD domain MERIDIANFG.LOCAL. Finance Department relies on shared drives hosted on FIN-FS-02. Endpoint stack: Windows Defender + Sysmon. Perimeter: Palo Alto firewall with PCAP capture on egress.",
  },
  {
    slug: "st-agnes-regional-hospital",
    name: "St. Agnes Regional Hospital",
    industry: "HEALTHCARE" as const,
    description:
      "A 400-bed regional hospital network with connected clinics, running Epic-style EHR infrastructure alongside a large fleet of legacy medical IoT devices.",
    employeeCount: 3100,
    networkNotes:
      "Flat clinical VLAN with limited segmentation from biomedical devices. Heavy reliance on RDP for remote clinician access. Compliance driven by HIPAA.",
  },
  {
    slug: "lakeshore-state-university",
    name: "Lakeshore State University",
    industry: "EDUCATION" as const,
    description:
      "A public university with 22,000 students, a research computing cluster, and a famously open, high-churn student network alongside a smaller, more locked-down administrative domain.",
    employeeCount: 4500,
    networkNotes:
      "Split network: open student Wi-Fi/residential VLANs vs. a hardened ADMIN.LSU.EDU domain for registrar, financial aid, and research grant systems.",
  },
  {
    slug: "ironforge-manufacturing",
    name: "Ironforge Manufacturing",
    industry: "MANUFACTURING" as const,
    description:
      "An industrial parts manufacturer running a mix of modern corporate IT and a legacy OT/ICS plant floor network with PLCs and SCADA systems that predate the current security team.",
    employeeCount: 850,
    networkNotes:
      "Corporate IT and OT/ICS networks are nominally segmented via a single firewall pair with looser-than-ideal rule sets. Plant floor systems run unpatched legacy Windows.",
  },
  {
    slug: "brightcart-retail",
    name: "BrightCart Retail",
    industry: "RETAIL" as const,
    description:
      "A mid-size e-commerce and brick-and-mortar retailer processing high-volume card-not-present payments through a custom checkout stack.",
    employeeCount: 2200,
    networkNotes:
      "PCI-scoped checkout environment, CDN-fronted storefront, third-party analytics and marketing scripts embedded directly on customer-facing pages.",
  },
  {
    slug: "harrow-county-government",
    name: "Harrow County Government",
    industry: "GOVERNMENT" as const,
    description:
      "A county-level public sector agency running citizen services, permitting, and elections infrastructure on a constrained budget with an under-resourced IT/security team.",
    employeeCount: 600,
    networkNotes:
      "Aging on-prem infrastructure, high reliance on third-party vendors and MSPs for critical systems, minimal network segmentation between departments.",
  },
];

async function main() {
  for (const c of COMPANIES) {
    await db.companyEnvironment.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    console.log(`✓ ${c.name}`);
  }
  console.log(`Companies seed complete: ${COMPANIES.length} companies.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
