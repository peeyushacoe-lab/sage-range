import { describe, it, expect } from "vitest";
import { shouldShowPreviews, previewTrophies } from "../src/lib/trophy-case";

const ALLOWLIST = "peeyush@cybersage.uk, organiser@cybersage.uk";
const ORGANISER = { userId: "u-organiser", email: "peeyush@cybersage.uk" };
const LEARNER = { userId: "u-learner", email: "student@example.com" };

describe("shouldShowPreviews", () => {
  it("shows samples to an allowlisted organiser on their own profile", () => {
    expect(shouldShowPreviews(ORGANISER, ORGANISER.userId, ALLOWLIST)).toBe(true);
  });

  // The important one: the allowlist must not become a way to display awards
  // you did not win to everyone who opens your profile.
  it("hides samples from a visitor to that same profile", () => {
    expect(shouldShowPreviews(ORGANISER, LEARNER.userId, ALLOWLIST)).toBe(false);
  });

  it("hides samples from a signed-out visitor", () => {
    expect(shouldShowPreviews(ORGANISER, null, ALLOWLIST)).toBe(false);
  });

  it("shows nothing to a learner on their own profile", () => {
    expect(shouldShowPreviews(LEARNER, LEARNER.userId, ALLOWLIST)).toBe(false);
  });

  // An organiser viewing someone else's profile must not project their own
  // preview set onto it.
  it("hides samples when an organiser views another profile", () => {
    expect(shouldShowPreviews(LEARNER, ORGANISER.userId, ALLOWLIST)).toBe(false);
  });

  it("fails closed when the allowlist is unset or empty", () => {
    expect(shouldShowPreviews(ORGANISER, ORGANISER.userId, undefined)).toBe(false);
    expect(shouldShowPreviews(ORGANISER, ORGANISER.userId, "")).toBe(false);
  });

  it("matches the allowlist case- and whitespace-insensitively", () => {
    expect(shouldShowPreviews({ ...ORGANISER, email: "  PEEYUSH@CyberSage.uk " }, ORGANISER.userId, ALLOWLIST)).toBe(true);
  });
});

describe("previewTrophies", () => {
  const samples = previewTrophies();

  it("covers every badge the platform can issue", () => {
    // 4 Knight tiers + 7 competitive awards + Champion and Medallist.
    expect(samples).toHaveLength(13);
  });

  // A badge that was not won must never be able to pass for one that was.
  it("marks every sample as a preview and gives none a certificate code", () => {
    for (const t of samples) {
      expect(t.preview).toBe(true);
      expect(t.certCode).toBeNull();
      expect(t.earnedAt).toBeNull();
    }
  });

  it("gives every sample a label, an event and a colour", () => {
    for (const t of samples) {
      expect(t.label).toBeTruthy();
      expect(t.event).toBeTruthy();
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("uses unique keys so React does not collapse them", () => {
    expect(new Set(samples.map((t) => t.key)).size).toBe(samples.length);
  });

  // Finalist no longer earns a certificate, so it must not appear as a badge.
  it("offers no championship sample below the podium", () => {
    const labels = samples.map((t) => t.label);
    expect(labels).not.toContain("Finalist");
    expect(labels).not.toContain("Competitor");
  });
});
