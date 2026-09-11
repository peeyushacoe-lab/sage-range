/**
 * Campus Pilot Program — university partnership sign-up.
 *
 * Public, unauthenticated lead capture at /campus-pilot. No session, no
 * user account required — a university contact just fills in the form.
 * Reviewed at /admin/campus-pilot.
 */

import { db } from "@/lib/db";
import type { CampusPilotStatus } from "@prisma/client";

export type SubmitPilotInput = {
  universityName: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  department?: string;
  studentEstimate?: string;
  country?: string;
  message?: string;
  heardFrom?: string;
};

export async function submitPilotApplication(input: SubmitPilotInput) {
  return db.campusPilotSubmission.create({
    data: {
      universityName: input.universityName.trim(),
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim().toLowerCase(),
      contactRole: input.contactRole.trim(),
      department: input.department?.trim() || null,
      studentEstimate: input.studentEstimate || null,
      country: input.country?.trim() || null,
      message: input.message?.trim() || null,
      heardFrom: input.heardFrom?.trim() || null,
    },
    select: { id: true },
  });
}

export async function listPilotSubmissions() {
  return db.campusPilotSubmission.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updatePilotStatus(id: string, status: CampusPilotStatus) {
  return db.campusPilotSubmission.update({ where: { id }, data: { status } });
}
