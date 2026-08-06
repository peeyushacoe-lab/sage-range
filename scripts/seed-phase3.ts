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
import { recomputeSeasonRanks } from "../src/lib/seasons";
import { simulateSeason } from "../src/lib/ladder-simulation";

/** Fixed so the seeded ladder is reproducible rather than different each run. */
const SIM_SEED = 20260727;

const db = new PrismaClient();

/** A season runs for 12 weeks from the start of the current week. */
const SEASON_WEEKS = 12;

function addWeeks(from: Date, weeks: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

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
    where: {
      role: { not: "ADMIN" },
      organizationMemberships: { none: { isLead: true } },
      hidden: false,
      // Integration tests create accounts under both domains. Six @test.com
      // users had reached the top of the live ladder because only one domain
      // was filtered here.
      AND: [
        { email: { not: { endsWith: "@example.com" } } },
        { email: { not: { endsWith: "@test.com" } } },
      ],
    },
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
  //
  // Reuse a live season if there is one. The slug is derived from the month
  // while the dates are anchored to the current week, so re-running in a later
  // month used to mint a second season and leave both active — which is how
  // production ended up with two, one of them holding stale ratings.
  const existing = await db.season.findFirst({
    where: { active: true, concludedAt: null },
    orderBy: { startsAt: "desc" },
  });

  const startsAt = existing?.startsAt ?? startOfCurrentWeekUTC();
  const endsAt = existing?.endsAt ?? addWeeks(startsAt, SEASON_WEEKS);
  const slug =
    existing?.slug ?? `season-${startsAt.getUTCFullYear()}-${startsAt.getUTCMonth() + 1}`;

  const season = existing
    ? existing
    : await db.season.create({
        data: {
          slug,
          name: `Season ${startsAt.getUTCFullYear()}.${Math.floor(startsAt.getUTCMonth() / 3) + 1}`,
          startsAt,
          endsAt,
          active: true,
        },
      });

  // Exactly one season may be live at a time. getActiveSeason takes the newest
  // of whatever is active, so a stray second one is invisible on the ladder
  // while still being reachable elsewhere.
  const strays = await db.season.updateMany({
    where: { active: true, id: { not: season.id } },
    data: { active: false },
  });
  if (strays.count > 0) {
    console.log(`Deactivated ${strays.count} other season(s) that were still marked live`);
  }

  console.log(
    `Season "${season.name}" ${startsAt.toISOString().slice(0, 10)} -> ${endsAt
      .toISOString()
      .slice(0, 10)} [LIVE]${existing ? " (reused)" : ""}`,
  );

  // ── Ratings, played out rather than assigned ─────────────────────────────
  //
  // The previous version picked a rating and a win/loss record from two
  // independent formulas — rating rising with the index, wins falling with it.
  // The result was a ladder whose top-rated player had one win and eleven
  // losses. Any two hand-written sequences drift apart like that eventually,
  // because nothing forces them to agree.
  //
  // So this plays a season instead. Each player gets a hidden skill, matches
  // are decided by that skill, and every result goes through the same
  // applyMatchResult the live ladder uses. Rating, record, events played and
  // peak then agree because one process produced all four.
  const standings = simulateSeason(users.length, { seed: SIM_SEED });

  let rated = 0;
  for (const [i, user] of users.entries()) {
    const s = standings[i];
    const row = {
      rating: s.rating,
      peakRating: s.peakRating,
      tier: tierForRating(s.rating),
      wins: s.wins,
      losses: s.losses,
      eventsPlayed: s.wins + s.losses,
    };

    await db.seasonRating.upsert({
      where: { seasonId_userId: { seasonId: season.id, userId: user.id } },
      create: { seasonId: season.id, userId: user.id, ...row },
      // Written on update too. With an empty update this script could never
      // correct a row it had already got wrong, which is how the inverted
      // ladder survived every re-run.
      update: row,
    });
    rated++;
  }

  const best = [...standings].sort((a, b) => b.rating - a.rating)[0];
  console.log(
    `Rated ${rated} players across the tier ladder ` +
      `(top: ${best.rating}, ${best.wins}W/${best.losses}L)`,
  );

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

  // Squad season points so the squad ladder is not empty. Points fall as the
  // record worsens, so the ordering matches the reason for it.
  for (const [i, squadId] of squadIds.entries()) {
    const stat = { points: 500 - i * 120, wins: 8 - i * 2, losses: i * 2 };
    await db.squadSeasonStat.upsert({
      where: { squadId_seasonId: { squadId, seasonId: season.id } },
      create: { squadId, seasonId: season.id, ...stat },
      update: stat,
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

  // Store the ladder placements now rather than leaving `rank` NULL until the
  // nightly cron happens to run. getSeasonLeaderboard falls back to array
  // position when rank is null, so a broken rank column looks completely
  // normal on the page — worth closing here rather than trusting the schedule.
  const ranked = await recomputeSeasonRanks(season.id);
  console.log(`Stored ladder placements for ${ranked} players`);

  console.log("\nPhase 3 seed complete.\n");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Phase 3 seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
