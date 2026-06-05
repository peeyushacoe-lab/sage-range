import { db } from "../src/lib/db";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

const user = await db.user.findUnique({ where: { email } });
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
console.log(`✓ ${email} is now ADMIN`);
