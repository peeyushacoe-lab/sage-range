/**
 * Seed script for Phase 3: ranked season, squads, and a tournament.
 *
 * Anchors the season on the current date so it is live immediately, rather
 * than producing an already-finished season the way a fixed calendar anchor
 * would.
 *
 * Usage: npm run seed:phase3
 */

import { PrismaClient } from "@prisma/client";
import { tierForRating } from "../src/lib/ranking";

const db = new PrismaClient();

/** A season runs for 12 weeks from the start of the current week. */
const SEASON_WEEKS = 12;

function startOfCurrentWeekUTC(): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const shift = d.getUTCDay() === 0 ? -6 : 1 - d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + shift);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log("\nSeeding Phase 3: season, squads, tournament\n");

  const users = await db.user.findMany({
    select: { id: true, email: true, displayName: true },
    take: 24,
    orderBy: { createdAt: "asc" },
  });

  if (users.length < 2) {
    console.error(
      "No users found. Seed users first — squads, ratings and entrants all need real accounts.",
    );
    process.exit(1);
  }
  console.log(`Found ${users.length} users\n`);

  // ── Season ───────────────────────────────────────────────────────────────
  const startsAt = startOfCurrentWeekUTC();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + SEASON_WEEKS * 7);

  const slug = `season-${startsAt.getUTCFullYear()}-${startsAt.getUTCMonth() + 1}`;

  const season = await db.season.upsert({
    where: { slug },
    create: {
      slug,
      name: `Season ${startsAt.getUTCFullYear()}.${Math.floor(startsAt.getUTCMonth() / 3) + 1}`,
      startsAt,
      endsAt,
      active: true,
    },
    update: { active: true, startsAt, endsAt },
  });
  console.log(
    `Season "${season.name}" ${startsAt.toISOString().slice(0, 10)} -> ${endsAt
      .toISOString()
      .slice(0, 10)} [LIVE]`,
  );

  // ── Ratings spread across tiers ──────────────────────────────────────────
  let rated = 0;
  for (const [i, user] of users.entries()) {
    // Deterministic spread from ~900 to ~2100 so every tier is represented.
    const rating = 900 + Math.round((i / Math.max(users.length - 1, 1)) * 1200);
    const wins = Math.max(0, 12 - i);
    const losses = Math.min(12, i);

    await db.seasonRating.upsert({
      where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
      create: {
        seasonId: season.id,
        userId: user.id,
        rating,
        peakRating: rating,
        tier: tierForRating(rating),
        wins,
        losses,
        eventsPlayed: wins + losses,
      },
      update: {},
    });
    rated++;
  }
  console.log(`Rated ${rated} players across the tier ladder`);

  // ── Squads ───────────────────────────────────────────────────────────────
  const SQUADS = [
    { slug: "blue-vanguard", name: "Blue Vanguard", tag: "BLUV", policy: "OPEN" as const },
    { slug: "packet-wardens", name: "Packet Wardens", tag: "PKTW", policy: "OPEN" as const },
    { slug: "night-shift", name: "Night Shift", tag: "NGHT", policy: "INVITE_ONLY" as const },
  ];

  let squadCount = 0;
  const squadIds: string[] = [];

  for (const [i, spec] of SQUADS.entries()) {
    const owner = users[i % users.length];
    if (!owner) continue;

    const existing = await db.squad.findUnique({ where: { slug: spec.slug } });
    if (existing) {
      squadIds.push(existing.id);
      console.log(`Squad [${spec.tag}] ${spec.name} already exists, skipping`);
      continue;
    }

    // SquadMember.userId is unique, so an owner already in a squad is skipped.
    const ownerTaken = await db.squadMember.findUnique({ where: { userId: owner.id } });
    if (ownerTaken) continue;

    const squad = await db.squad.create({
      data: {
        slug: spec.slug,
        name: spec.name,
        tag: spec.tag,
        description: `${spec.name} — a standing squad competing across the season.`,
        ownerId: owner.id,
        joinPolicy: spec.policy,
      },
    });
    await db.squadMember.create({
      data: { squadId: squad.id, userId: owner.id, role: "OWNER" },
    });

    squadIds.push(squad.id);
    squadCount++;
    console.log(`Squad [${spec.tag}] ${spec.name} owned by ${owner.displayName || owner.email}`);
  }

  // Fill rosters from users who are not yet in a squad.
  let placed = 0;
  for (const user of users) {
    if (squadIds.length === 0) break;
    const taken = await db.squadMember.findUnique({ where: { userId: user.id } });
    if (taken) continue;

    const squadId = squadIds[placed % squadIds.length];
    const size = await db.squadMember.count({ where: { squadId } });
    if (size >= 8) continue;

    await db.squadMember.create({ data: { squadId, userId: user.id, role: "MEMBER" } });
    placed++;
  }
  console.log(`Created ${squadCount} squads, placed ${placed} additional members`);

  // Squad season points so the squad ladder is not empty.
  for (const [i, squadId] of squadIds.entries()) {
    await db.squadSeasonStat.upsert({
      where: { squadId_seasonId: { squadId, seasonId: season.id } },
      create: {
        squadId,
        seasonId: season.id,
        points: 500 - i * 120,
        wins: 8 - i * 2,
        losses: i * 2,
      },
      update: {},
    });
  }

  // ── Tournament open for registration ─────────────────────────────────────
  const opensAt = new Date(startsAt);
  const closesAt = new Date();
  closesAt.setUTCDate(closesAt.getUTCDate() + 7);
  const tStartsAt = new Date(closesAt);
  tStartsAt.setUTCDate(tStartsAt.getUTCDate() + 1);

  const tournamentSlug = `open-cup-${startsAt.getUTCFullYear()}`;
  const tournament = await db.tournament.upsert({
    where: { slug: tournamentSlug },
    create: {
      slug: tournamentSlug,
      name: "Sage Open Cup",
      description:
        "Single-elimination solo bracket. Seeding follows your current season rating.",
      seasonId: season.id,
      format: "SINGLE_ELIMINATION",
      entrantType: "SOLO",
      status: "REGISTRATION",
      maxEntrants: 16,
      registrationOpensAt: opensAt,
      registrationClosesAt: closesAt,
      startsAt: tStartsAt,
    },
    update: { status: "REGISTRATION", registrationClosesAt: closesAt, startsAt: tStartsAt },
  });

  // Enter enough players to make a non-trivial bracket, including a bye round.
  let entered = 0;
  for (const user of users.slice(0, 11)) {
    const dupe = await db.tournamentEntrant.findFirst({
      where: { tournamentId: tournament.id, userId: user.id },
    });
    if (dupe) continue;
    await db.tournamentEntrant.create({
      data: { tournamentId: tournament.id, userId: user.id },
    });
    entered++;
  }

  console.log(
    `Tournament "${tournament.name}" open for registration with ${entered} entrants` +
      " (11 entrants pads to a 16 bracket, exercising byes)",
  );

  console.log("\nPhase 3 seed complete.\n");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Phase 3 seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
