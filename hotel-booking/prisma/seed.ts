import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

// Create PrismaClient with MariaDB adapter (same as src/lib/prisma.ts)
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  connectionLimit: 10,
})

const prisma = new PrismaClient({ adapter })



async function main() {
  console.log("🌱 Seeding System Admin...");

  const email = process.env.SEED_ADMIN_EMAIL!;
  const password = process.env.SEED_ADMIN_PASSWORD!;
  const name = process.env.SEED_ADMIN_NAME!;

  const existing = await prisma.system_admins.findUnique({
    where: {
      email,
    },
  });

  if (existing) {
    console.log("✅ System admin already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.system_admins.create({
    data: {
      name,
      email,
      password: hashedPassword,
      is_active: true,
      is_blocked: false,
    },
  });

  console.log("==================================");
  console.log("✅ System Admin Created");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("==================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });