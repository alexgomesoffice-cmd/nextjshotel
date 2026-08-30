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

async function seedRoles() {
  const roleSeeds = [
    { id: 1, role_name: 'HOTEL_ADMIN' },
    { id: 2, role_name: 'HOTEL_SUB_ADMIN' },
  ]

  for (const role of roleSeeds) {
    const existingRole = await prisma.roles.findUnique({ where: { id: role.id } })

    if (existingRole) {
      if (existingRole.role_name !== role.role_name) {
        await prisma.roles.update({
          where: { id: role.id },
          data: { role_name: role.role_name },
        })
      }
      continue
    }

    await prisma.roles.create({ data: role })
  }
}

async function seedHeroBanners() {
  console.log('🌱 Seeding Hero Banners...')
  for (let i = 1; i <= 5; i++) {
    const existing = await prisma.hero_banners.findUnique({
      where: { slot: i }
    })
    if (!existing) {
      await prisma.hero_banners.create({
        data: {
          slot: i,
          is_active: false
        }
      })
    }
  }
}

async function main() {
  console.log('🌱 Seeding roles...')
  await seedRoles()

  await seedHeroBanners()

  console.log('🌱 Seeding System Admin...')

  const email = process.env.SEED_ADMIN_EMAIL!
  const password = process.env.SEED_ADMIN_PASSWORD!
  const name = process.env.SEED_ADMIN_NAME!

  const existing = await prisma.system_admins.findUnique({
    where: {
      email,
    },
  })

  if (existing) {
    console.log('✅ System admin already exists.')
    return
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.system_admins.create({
    data: {
      name,
      email,
      password: hashedPassword,
      is_active: true,
      is_blocked: false,
    },
  })

  console.log('==================================')
  console.log('✅ System Admin Created')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('==================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })