/**
 * One-off script to create your login.
 * Run with: npx tsx scripts/create-user.ts you@example.com "your-password" "Your Name"
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, name] = process.argv;
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/create-user.ts you@example.com "your-password" "Your Name"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { passwordHash, name },
    create: { email: email.toLowerCase().trim(), passwordHash, name },
  });

  console.log(`User ready: ${user.email} (id: ${user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
