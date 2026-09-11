/**
 * Client-side environment registry — 2D version.
 *
 * The server only ever sends a scenario's `environment` key and a flat list
 * of evidence `key`s — never a position, never what the object means. Where
 * each key sits on screen, and what it looks like, is purely a rendering
 * concern and lives here. A second scenario reusing "office-v1" with
 * different evidence keys just needs its own entry — no schema change.
 *
 * Positions are percentages of the room illustration (top/left), not 3D
 * coordinates — this replaced an earlier first-person 3D build that hit an
 * unresolved react-reconciler/Turbopack production crash under time
 * pressure. Same evidence system underneath either way.
 */

export type ObjectAppearance = "screen" | "small" | "note" | "plant";

export type PlacedObject = {
  key: string;
  top: number; // percentage, 0-100
  left: number; // percentage, 0-100
  appearance: ObjectAppearance;
};

export const ENVIRONMENTS: Record<string, { objects: PlacedObject[] }> = {
  // All three scenarios below share this one visual room (it's the same
  // office, different nights) — their evidence keys never collide, and only
  // the active scenario's own keys ever render, so this list is a superset,
  // not a per-scenario duplicate.
  "office-v1": {
    objects: [
      // IR-001 — The Insider
      { key: "laptop-login-log", top: 38, left: 16, appearance: "screen" },
      { key: "laptop-recent-file", top: 38, left: 24, appearance: "screen" },
      { key: "usb-under-desk", top: 58, left: 18, appearance: "small" },
      { key: "badge-reader-log", top: 30, left: 82, appearance: "screen" },
      { key: "usb-holiday-photos", top: 62, left: 68, appearance: "small" },
      { key: "sticky-note-meeting", top: 44, left: 50, appearance: "note" },
      { key: "desk-plant", top: 70, left: 50, appearance: "plant" },

      // IR-002 — Night Shift Ransomware
      { key: "ws-quarantine-alert", top: 34, left: 14, appearance: "screen" },
      { key: "phishing-attachment", top: 40, left: 40, appearance: "screen" },
      { key: "network-spread-log", top: 30, left: 82, appearance: "screen" },
      { key: "backup-snapshot", top: 60, left: 62, appearance: "screen" },
      { key: "printer-error", top: 66, left: 28, appearance: "small" },
      { key: "helpdesk-ticket", top: 46, left: 50, appearance: "note" },
      { key: "coffee-machine-log", top: 74, left: 50, appearance: "small" },

      // IR-003 — Phishing → Account Compromise
      { key: "phishing-email", top: 38, left: 16, appearance: "screen" },
      { key: "login-anomaly", top: 30, left: 82, appearance: "screen" },
      { key: "mailbox-rule", top: 40, left: 40, appearance: "screen" },
      { key: "vendor-email-change", top: 58, left: 62, appearance: "screen" },
      { key: "password-reset-log", top: 62, left: 18, appearance: "small" },
      { key: "vpn-log-normal", top: 46, left: 50, appearance: "note" },
      { key: "parking-note", top: 72, left: 50, appearance: "small" },

      // IR-001 Phase 2 — Final Determination
      { key: "threatening-text", top: 60, left: 18, appearance: "small" },
      { key: "david-login-overlap", top: 30, left: 82, appearance: "screen" },
      { key: "change-ticket", top: 40, left: 40, appearance: "note" },
      { key: "exit-interview-note", top: 46, left: 50, appearance: "note" },
      { key: "bank-transfer-alert", top: 58, left: 62, appearance: "screen" },

      // IR-002 Phase 2 — Full Scope Assessment
      { key: "dns-exfil-log", top: 34, left: 14, appearance: "screen" },
      { key: "hr-share-log", top: 30, left: 82, appearance: "screen" },
      { key: "legal-share-untouched", top: 40, left: 40, appearance: "screen" },
      { key: "ransom-note-screenshot", top: 66, left: 28, appearance: "small" },
      { key: "immutable-backup-confirmation", top: 60, left: 62, appearance: "screen" },

      // IR-003 Phase 2 — Contain the Campaign
      { key: "payment-hold-log", top: 38, left: 16, appearance: "screen" },
      { key: "second-phishing-attempt", top: 30, left: 82, appearance: "screen" },
      { key: "payroll-employee-no-click", top: 46, left: 50, appearance: "note" },
      { key: "sender-domain-registration", top: 40, left: 40, appearance: "screen" },
      { key: "bank-account-reused", top: 62, left: 18, appearance: "small" },

      // IR-004 — The Dropped Drive
      { key: "usb-insertion-log", top: 38, left: 16, appearance: "screen" },
      { key: "autorun-script-log", top: 38, left: 24, appearance: "screen" },
      { key: "security-camera-still", top: 30, left: 82, appearance: "screen" },
      { key: "outbound-c2-beacon", top: 58, left: 62, appearance: "screen" },
      { key: "usb-drive-label", top: 58, left: 18, appearance: "small" },
      { key: "tom-blake-statement", top: 46, left: 50, appearance: "note" },
      { key: "break-room-notice", top: 70, left: 50, appearance: "note" },
      // IR-004 Phase 2 — Contain the Beacon
      { key: "network-scan-log", top: 34, left: 14, appearance: "screen" },
      { key: "second-host-auth-attempt", top: 30, left: 82, appearance: "screen" },
      { key: "data-staging-folder", top: 40, left: 40, appearance: "screen" },
      { key: "isolation-timestamp", top: 60, left: 62, appearance: "screen" },
      { key: "it-inventory-audit-note", top: 46, left: 50, appearance: "note" },

      // IR-005 — Privileged Account Abuse
      { key: "permission-change-log", top: 38, left: 16, appearance: "screen" },
      { key: "admin-mfa-log", top: 38, left: 24, appearance: "screen" },
      { key: "admin-out-of-office", top: 30, left: 82, appearance: "note" },
      { key: "contractor-badge-log", top: 58, left: 62, appearance: "screen" },
      { key: "helpdesk-callback-record", top: 58, left: 18, appearance: "screen" },
      { key: "late-night-badge-entries", top: 46, left: 50, appearance: "note" },
      { key: "printer-toner-request", top: 70, left: 50, appearance: "note" },
      // IR-005 Phase 2 — Undo the Damage
      { key: "additional-grants-log", top: 34, left: 14, appearance: "screen" },
      { key: "wells-account-still-active", top: 30, left: 82, appearance: "screen" },
      { key: "login-attempt-using-wells", top: 40, left: 40, appearance: "screen" },
      { key: "wells-notified-unaware", top: 60, left: 62, appearance: "note" },
      { key: "legit-onboarding-ticket", top: 46, left: 50, appearance: "note" },

      // IR-006 — Intellectual Property Theft
      { key: "repo-download-log", top: 38, left: 16, appearance: "screen" },
      { key: "personal-cloud-upload", top: 38, left: 24, appearance: "screen" },
      { key: "offer-letter-email", top: 30, left: 82, appearance: "screen" },
      { key: "exit-checklist-incomplete", top: 58, left: 62, appearance: "screen" },
      { key: "team-lead-note", top: 58, left: 18, appearance: "note" },
      { key: "routine-backup-policy", top: 46, left: 50, appearance: "note" },
      { key: "slack-farewell-message", top: 70, left: 50, appearance: "note" },
      // IR-006 Phase 2 — Confirm the Damage
      { key: "competitor-job-start-date", top: 34, left: 14, appearance: "note" },
      { key: "competitor-product-similarity-report", top: 30, left: 82, appearance: "screen" },
      { key: "personal-drive-still-populated", top: 40, left: 40, appearance: "screen" },
      { key: "marcus-lawyer-statement", top: 60, left: 62, appearance: "note" },
      { key: "unrelated-press-release", top: 46, left: 50, appearance: "note" },

      // IR-007 — Web Server Compromise
      { key: "defacement-log", top: 38, left: 16, appearance: "screen" },
      { key: "webshell-file", top: 38, left: 24, appearance: "screen" },
      { key: "vulnerable-plugin-log", top: 30, left: 82, appearance: "screen" },
      { key: "webshell-access-after-revert", top: 58, left: 62, appearance: "screen" },
      { key: "patch-ticket-ignored", top: 58, left: 18, appearance: "screen" },
      { key: "marketing-team-panic-email", top: 46, left: 50, appearance: "note" },
      { key: "unrelated-ssl-cert-renewal", top: 70, left: 50, appearance: "note" },
      // IR-007 Phase 2 — What Did They Actually Get
      { key: "db-connection-attempt", top: 34, left: 14, appearance: "screen" },
      { key: "db-query-log-suspicious", top: 30, left: 82, appearance: "screen" },
      { key: "outbound-transfer-size", top: 40, left: 40, appearance: "screen" },
      { key: "waf-block-log", top: 60, left: 62, appearance: "screen" },
      { key: "customer-count-estimate", top: 46, left: 50, appearance: "note" },

      // IR-008 — Supply-Chain Compromise
      { key: "update-package-hash-mismatch", top: 38, left: 16, appearance: "screen" },
      { key: "vendor-advisory", top: 38, left: 24, appearance: "screen" },
      { key: "affected-machine-count", top: 30, left: 82, appearance: "screen" },
      { key: "anomalous-process-spawn", top: 58, left: 62, appearance: "screen" },
      { key: "unaffected-machine-note", top: 58, left: 18, appearance: "screen" },
      { key: "helpdesk-tickets-slow-laptop", top: 46, left: 50, appearance: "note" },
      { key: "office-snack-order", top: 70, left: 50, appearance: "note" },
      // IR-008 Phase 2 — Did It Reach Anything That Matters
      { key: "affected-privileged-host-list", top: 34, left: 14, appearance: "screen" },
      { key: "payload-behavior-analysis", top: 30, left: 82, appearance: "screen" },
      { key: "admin-workstation-credential-check", top: 40, left: 40, appearance: "screen" },
      { key: "beacon-traffic-blocked", top: 60, left: 62, appearance: "screen" },
      { key: "unrelated-helpdesk-vpn-issue", top: 46, left: 50, appearance: "note" },
    ],
  },
};
