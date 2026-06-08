-- Rename clerkId column to externalId (Keycloak sub claim)
ALTER TABLE "User" RENAME COLUMN "clerkId" TO "externalId";
