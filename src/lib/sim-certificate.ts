// A simulation session only qualifies for a certificate if the incident was
// actually contained and the score clears the platform's "STRONG" bar (see
// assessmentRating() in the certificate/debrief pages) — a BREACHED or
// low-scoring run no longer earns a shareable certificate by default.
export const SIM_CERT_MIN_SCORE = 68;

export function isSimCertEligible(status: string, score: number): boolean {
  return status === "CONTAINED" && score >= SIM_CERT_MIN_SCORE;
}
