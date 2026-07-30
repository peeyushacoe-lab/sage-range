/**
 * Seed script: Ticket Queue Simulator
 *
 * Builds six themed SOC shifts from the ticket library in
 * src/content/soc-tickets.ts. Each shift draws a different slice of the
 * library, so a second shift is not a repeat of the first, and every shift
 * mixes genuine incidents with noise.
 *
 * Replaces an earlier version that cycled two alert templates across every
 * shift, which is why the queue looked empty and repetitive.
 *
 * Usage: npm run seed:tickets
 */

import { PrismaClient } from "@prisma/client";
import {
  SOC_TICKETS,
  SLA_BY_SEVERITY,
  ticketsForShift,
  type SocTicket,
} from "../src/content/soc-tickets";

const db = new PrismaClient();

const SHIFTS = [
  {
    slug: "soc-shift-monday-days",
    title: "Monday — Day Shift",
    tickets: 14,
    briefing:
      "Monday morning after a quiet weekend. The overnight queue has backed up and the estate is coming online. Work the queue in order, escalate what genuinely needs it, and close the noise cleanly — a shift spent chasing false positives is a shift the real incident went unseen.",
  },
  {
    slug: "soc-shift-tuesday-nights",
    title: "Tuesday — Night Shift",
    tickets: 12,
    briefing:
      "Overnight cover with a skeleton team. Escalating wakes someone up, so the bar is higher than on days — but a genuine critical cannot wait until morning. Judge accordingly.",
  },
  {
    slug: "soc-shift-wednesday-patch",
    title: "Wednesday — Patch Window",
    tickets: 13,
    briefing:
      "Scheduled maintenance is running across the estate tonight. Deployment tooling will generate activity that looks hostile out of context. Check the parent process and the change record before you escalate.",
  },
  {
    slug: "soc-shift-thursday-incident",
    title: "Thursday — Active Incident",
    tickets: 15,
    briefing:
      "An incident is already open elsewhere in the business and attention is stretched. Expect related activity in your queue. Correlate before you treat something as isolated.",
  },
  {
    slug: "soc-shift-friday-handover",
    title: "Friday — Pre-Weekend Handover",
    tickets: 12,
    briefing:
      "Last shift before reduced weekend cover. Anything you leave open runs unattended for 48 hours. Resolve what you can and be explicit about what you are handing over.",
  },
  {
    slug: "soc-shift-weekend-skeleton",
    title: "Weekend — Skeleton Cover",
    tickets: 10,
    briefing:
      "Minimal staffing and slower response from every other team. Attackers pick weekends for exactly this reason. Prioritise ruthlessly.",
  },
];

/** Spread creation times across the shift so SLA clocks differ per ticket. */
function stagger(index: number, total: number): Date {
  const now = new Date();
  const minutesBack = Math.round(((total - index) / total) * 180);
  return new Date(now.getTime() - minutesBack * 60_000);
}

async function seedTickets() {
  console.log("\nSeeding Ticket Queue Simulator\n");
  console.log(
    `Ticket library: ${SOC_TICKETS.length} distinct tickets ` +
      `(${SOC_TICKETS.filter((t) => !t.isBenign).length} genuine, ` +
      `${SOC_TICKETS.filter((t) => t.isBenign).length} noise)\n`,
  );

  let shiftsCreated = 0;
  let ticketsCreated = 0;
  let offset = 0;

  for (const spec of SHIFTS) {
    const shift = await db.socShift.upsert({
      where: { slug: spec.slug },
      create: {
        slug: spec.slug,
        title: spec.title,
        briefing: spec.briefing,
        timeLimitSec: 2700,
        published: true,
      },
      update: { title: spec.title, briefing: spec.briefing, published: true },
    });

    const existing = await db.shiftTicket.count({ where: { shiftId: shift.id } });
    if (existing > 0) {
      console.log(`${spec.title}: already has ${existing} tickets, skipping`);
      offset += spec.tickets;
      continue;
    }

    // Each shift starts further into the library so the slices differ.
    const selected: SocTicket[] = ticketsForShift(spec.tickets, offset);
    offset += spec.tickets;

    for (const [i, ticket] of selected.entries()) {
      const createdAt = stagger(i, selected.length);
      await db.shiftTicket.create({
        data: {
          shiftId: shift.id,
          queuePosition: i + 1,
          severity: ticket.severity,
          category: ticket.category,
          title: ticket.title,
          description: ticket.description,
          rawAlert: { ...ticket.rawAlert, observedAt: createdAt.toISOString() },
          slaMinutes: SLA_BY_SEVERITY[ticket.severity],
          createdAt,
        },
      });
      ticketsCreated++;
    }

    shiftsCreated++;
    const noise = selected.filter((t) => t.isBenign).length;
    console.log(
      `${spec.title}: ${selected.length} tickets ` +
        `(${selected.length - noise} genuine, ${noise} noise)`,
    );
  }

  console.log(`\n${shiftsCreated} shifts seeded, ${ticketsCreated} tickets created.\n`);
  await db.$disconnect();
}

seedTickets().catch(async (err) => {
  console.error("Ticket seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
