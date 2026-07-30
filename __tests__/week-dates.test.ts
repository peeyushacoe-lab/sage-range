import { describe, it, expect } from "vitest";
import {
  mondayOfWeekUTC,
  deadlineForWeek,
  isoWeekNumber,
  isoWeekYear,
} from "@/lib/week-dates";

const iso = (d: Date) => d.toISOString();
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("mondayOfWeekUTC", () => {
  it("returns the same day for a Monday", () => {
    // 2026-07-27 is a Monday
    expect(day(mondayOfWeekUTC(new Date("2026-07-27T09:30:00Z")))).toBe("2026-07-27");
  });

  it("walks back to Monday from midweek", () => {
    // Thursday
    expect(day(mondayOfWeekUTC(new Date("2026-07-30T23:00:00Z")))).toBe("2026-07-27");
  });

  it("treats Sunday as the close of the week that already began", () => {
    // Regression: Sunday is getUTCDay()===0, so a naive `1 - day` shift jumps
    // FORWARD to the next Monday and skips the week in progress.
    expect(day(mondayOfWeekUTC(new Date("2026-08-02T12:00:00Z")))).toBe("2026-07-27");
  });

  it("normalises to exactly midnight UTC", () => {
    expect(iso(mondayOfWeekUTC(new Date("2026-07-30T17:45:31.123Z")))).toBe(
      "2026-07-27T00:00:00.000Z",
    );
  });

  it("crosses a month boundary correctly", () => {
    // Wednesday 1 Jul 2026 -> Monday 29 Jun 2026
    expect(day(mondayOfWeekUTC(new Date("2026-07-01T00:00:00Z")))).toBe("2026-06-29");
  });
});

describe("deadlineForWeek", () => {
  it("closes Sunday 23:59 UTC, six days after the Monday", () => {
    const monday = mondayOfWeekUTC(new Date("2026-07-30T00:00:00Z"));
    expect(iso(deadlineForWeek(monday))).toBe("2026-08-02T23:59:00.000Z");
  });

  it("always lands on a Sunday", () => {
    for (const d of ["2026-01-05", "2026-06-29", "2026-12-28"]) {
      const deadline = deadlineForWeek(new Date(`${d}T00:00:00Z`));
      expect(deadline.getUTCDay()).toBe(0);
    }
  });

  it("produces a deadline strictly after its release", () => {
    const monday = mondayOfWeekUTC(new Date("2026-07-30T00:00:00Z"));
    expect(deadlineForWeek(monday).getTime()).toBeGreaterThan(monday.getTime());
  });
});

describe("isoWeekNumber", () => {
  it("numbers a mid-year week", () => {
    // Monday 2026-07-27 is ISO week 31
    expect(isoWeekNumber(new Date("2026-07-27T00:00:00Z"))).toBe(31);
  });

  it("gives week 1 to the first ISO week of 2026", () => {
    // 2026-01-01 is a Thursday, so that week is 2026-W01
    expect(isoWeekNumber(new Date("2026-01-01T00:00:00Z"))).toBe(1);
  });

  it("assigns late-December days to week 1 of the next year", () => {
    // 2025-12-29 (Mon) belongs to ISO 2026-W01
    expect(isoWeekNumber(new Date("2025-12-29T00:00:00Z"))).toBe(1);
    expect(isoWeekYear(new Date("2025-12-29T00:00:00Z"))).toBe(2026);
  });

  it("never returns 0 or above 53", () => {
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.UTC(2025, 0, 1 + i));
      const w = isoWeekNumber(d);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(53);
    }
  });
});

describe("seeded weekly cases are not born expired", () => {
  it("gives the current week a deadline in the future", () => {
    // Regression: anchoring the ramp on the first Monday of January meant every
    // seeded case had a deadline months in the past, so the release job
    // published an already-expired case and no certificate could be earned.
    const now = new Date();
    const deadline = deadlineForWeek(mondayOfWeekUTC(now));
    expect(deadline.getTime()).toBeGreaterThan(now.getTime());
  });

  it("produces eight consecutive non-overlapping weeks from today", () => {
    const start = mondayOfWeekUTC(new Date("2026-07-30T00:00:00Z"));
    const weeks = Array.from({ length: 8 }, (_, offset) => {
      const monday = new Date(start);
      monday.setUTCDate(monday.getUTCDate() + offset * 7);
      return { monday, deadline: deadlineForWeek(monday) };
    });

    expect(weeks).toHaveLength(8);
    for (let i = 1; i < weeks.length; i++) {
      // each week starts after the previous one's deadline
      expect(weeks[i].monday.getTime()).toBeGreaterThan(weeks[i - 1].deadline.getTime());
    }
    // and the ramp spans 8 distinct ISO weeks
    const numbers = new Set(weeks.map((w) => isoWeekNumber(w.monday)));
    expect(numbers.size).toBe(8);
  });
});
