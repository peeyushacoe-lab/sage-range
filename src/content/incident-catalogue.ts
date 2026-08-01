/**
 * Incident catalogue — company environments paired with attack chains.
 *
 * Pairings are chosen for plausibility, not coverage: an OT intrusion belongs
 * in manufacturing and nowhere else here, while credential stuffing suits any
 * organisation with a customer login. That is what stops the catalogue reading
 * as the same incident with the company name swapped.
 */

import { ATTACK_CHAINS, type AttackChain, type ChainContext } from "./incident-chains";

export type CompanyPairing = {
  slug: string;
  label: string;
  context: Omit<ChainContext, "company">;
  /** Chain keys that make sense for this sector. */
  chains: string[];
};

export const COMPANY_PAIRINGS: CompanyPairing[] = [
  {
    slug: "st-agnes-regional-hospital",
    label: "St. Agnes Regional Hospital",
    context: {
      domain: "stagnes-health.uk",
      crownJewel: "PACS imaging server",
      user: "a.patel",
      host: "WKS-CLIN-114",
    },
    chains: ["ransomware", "bec", "insider", "webshell", "stuffing", "ad"],
  },
  {
    slug: "meridian-finance-group",
    label: "Meridian Finance Group",
    context: {
      domain: "meridian-finance.uk",
      crownJewel: "core banking file share",
      user: "j.smith",
      host: "WKS-FIN-207",
    },
    chains: ["bec", "ad", "cloud", "stuffing", "ddos", "insider"],
  },
  {
    slug: "ironforge-manufacturing",
    label: "Ironforge Manufacturing",
    context: {
      domain: "ironforge-mfg.uk",
      crownJewel: "turbine design archive",
      user: "l.okafor",
      host: "WKS-ENG-052",
    },
    chains: ["ot", "insider", "ransomware", "supply", "webshell"],
  },
  {
    slug: "brightcart-retail",
    label: "BrightCart Retail",
    context: {
      domain: "brightcart.uk",
      crownJewel: "customer order database",
      user: "m.eriksson",
      host: "WKS-RET-089",
    },
    chains: ["stuffing", "webshell", "ddos", "cloud", "ransomware", "bec"],
  },
  {
    slug: "harrow-county-government",
    label: "Harrow County Government",
    context: {
      domain: "harrow-county.gov.uk",
      crownJewel: "resident records system",
      user: "d.mensah",
      host: "WKS-GOV-023",
    },
    chains: ["ad", "ransomware", "bec", "webshell", "ddos", "insider"],
  },
  {
    slug: "nimbus-cloud-solutions",
    label: "Nimbus Cloud Solutions",
    context: {
      domain: "nimbus-cloud.io",
      crownJewel: "customer tenancy control plane",
      user: "h.silva",
      host: "WKS-ENG-311",
    },
    chains: ["cloud", "supply", "ad", "webshell", "insider", "ddos"],
  },
  {
    slug: "lakeshore-state-university",
    label: "Lakeshore State University",
    context: {
      domain: "lakeshore.ac.uk",
      crownJewel: "research data store",
      user: "r.novak",
      host: "WKS-RES-140",
    },
    chains: ["stuffing", "ransomware", "insider", "bec", "ddos", "cloud"],
  },
];

export type CatalogueEntry = {
  slug: string;
  companySlug: string;
  codename: string;
  title: string;
  chain: AttackChain;
  context: ChainContext;
};

/** Every (company, chain) pairing, flattened into incident definitions. */
export function buildIncidentCatalogue(): CatalogueEntry[] {
  const chainsByKey = new Map(ATTACK_CHAINS.map((c) => [c.key, c]));
  const out: CatalogueEntry[] = [];

  for (const pairing of COMPANY_PAIRINGS) {
    for (const key of pairing.chains) {
      const chain = chainsByKey.get(key);
      // A pairing naming a chain that does not exist is a content bug, not a
      // reason to emit a broken incident.
      if (!chain) continue;

      const short = pairing.slug.split("-")[0];
      out.push({
        slug: `${short}-${key}`,
        companySlug: pairing.slug,
        codename: `${short.toUpperCase()}-${key.toUpperCase()}`,
        title: `${chain.name} — ${pairing.label}`,
        chain,
        context: { company: pairing.label, ...pairing.context },
      });
    }
  }

  return out;
}
