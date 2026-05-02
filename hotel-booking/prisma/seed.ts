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
  console.log('🌱 Starting seed...')

  // 1. Seed roles
  console.log('📦 Seeding roles...')
  await prisma.roles.upsert({
    where: { id: 1 },
    update: {},
    create: { role_name: 'HOTEL_ADMIN' },
  })
  await prisma.roles.upsert({
    where: { id: 2 },
    update: {},
    create: { role_name: 'HOTEL_SUB_ADMIN' },
  })
  console.log('✅ Roles seeded')

  // 2. Seed hotel types
  console.log('📦 Seeding hotel_types...')
  const hotelTypes = [
    'Hotel',
    'Resort',
    'Boutique',
    'Hostel',
    'Guest House',
    'Serviced Apartment',
  ]
  for (const name of hotelTypes) {
    await prisma.hotel_types.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log('✅ Hotel types seeded')

  // 3. Seed cities (major BD cities)
  console.log('📦 Seeding cities...')
  const cities = [
    { name: 'Dhaka', image_url: 'https://images.unsplash.com/photo-1568731015204-753b32d5c1eb?w=800' },
    { name: 'Chittagong', image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800' },
    { name: 'Sylhet', image_url: 'https://images.unsplash.com/photo-1588865704093-0b5d0c4210c3?w=800' },
    { name: 'Cox\'s Bazar', image_url: 'https://images.unsplash.com/photo-1573052905904-34ad8c27e0e0?w=800' },
    { name: 'Khulna', image_url: 'https://images.unsplash.com/photo-1568711146297-b8e5c3a4a07e?w=800' },
    { name: 'Barisal', image_url: 'https://images.unsplash.com/photo-1573052905904-34ad8c27e0e0?w=800' },
    { name: 'Rangpur', image_url: 'https://images.unsplash.com/photo-1588865704093-0b5d0c4210c3?w=800' },
    { name: 'Mymensingh', image_url: 'https://images.unsplash.com/photo-1568731015204-753b32d5c1eb?w=800' },
    { name: 'Tangail', image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800' },
    { name: 'Bogura', image_url: 'https://images.unsplash.com/photo-1588865704093-0b5d0c4210c3?w=800' },
    { name: 'Jessore', image_url: 'https://images.unsplash.com/photo-1568711146297-b8e5c3a4a07e?w=800' },
    { name: 'Comilla', image_url: 'https://images.unsplash.com/photo-1573052905904-34ad8c27e0e0?w=800' },
    { name: 'Narayanganj', image_url: 'https://images.unsplash.com/photo-1568731015204-753b32d5c1eb?w=800' },
    { name: 'Savar', image_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800' },
    { name: 'Mirpur', image_url: 'https://images.unsplash.com/photo-1588865704093-0b5d0c4210c3?w=800' },
  ]
  for (const city of cities) {
    await prisma.cities.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    })
  }
  console.log('✅ Cities seeded')

  // 4. Seed amenities (global defaults)
  console.log('📦 Seeding amenities...')
  
  // Hotel-level amenities
  const hotelAmenities = [
    { name: 'Free WiFi', icon: 'wifi', context: 'HOTEL' as const },
    { name: 'Parking', icon: 'parking', context: 'HOTEL' as const },
    { name: 'Restaurant', icon: 'utensils', context: 'HOTEL' as const },
    { name: 'Room Service', icon: 'bell', context: 'HOTEL' as const },
    { name: 'Fitness Center', icon: 'dumbbell', context: 'HOTEL' as const },
    { name: 'Swimming Pool', icon: 'waves', context: 'HOTEL' as const },
    { name: 'Spa', icon: 'sparkles', context: 'HOTEL' as const },
    { name: 'Airport Transfer', icon: 'car', context: 'HOTEL' as const },
    { name: 'Laundry', icon: 'shirt', context: 'HOTEL' as const },
    { name: '24/7 Front Desk', icon: 'clock', context: 'HOTEL' as const },
    { name: 'Conference Room', icon: 'users', context: 'HOTEL' as const },
    { name: 'Business Center', icon: 'briefcase', context: 'HOTEL' as const },
  ]
  
  // Room-level amenities
  const roomAmenities = [
    { name: 'Air Conditioning', icon: 'wind', context: 'ROOM' as const },
    { name: 'TV', icon: 'tv', context: 'ROOM' as const },
    { name: 'Hot Water', icon: 'flame', context: 'ROOM' as const },
    { name: 'Mini Bar', icon: 'wine', context: 'ROOM' as const },
    { name: 'Safe', icon: 'lock', context: 'ROOM' as const },
    { name: 'Balcony', icon: 'sun', context: 'ROOM' as const },
    { name: 'City View', icon: 'building', context: 'ROOM' as const },
    { name: 'Sea View', icon: 'waves', context: 'ROOM' as const },
    { name: 'Room Service', icon: 'bell', context: 'ROOM' as const },
    { name: 'Coffee Maker', icon: 'coffee', context: 'ROOM' as const },
  ]

  for (const amenity of [...hotelAmenities, ...roomAmenities]) {
    // Check if exists first
    const existing = await prisma.amenities.findFirst({
      where: { name: amenity.name, hotel_id: null },
    })
    if (!existing) {
      await prisma.amenities.create({
        data: {
          name: amenity.name,
          icon: amenity.icon,
          context: amenity.context,
          is_default: true,
          hotel_id: null,
        },
      })
    }
  }
  console.log('✅ Amenities seeded')

  // 5. Seed bed types
  console.log('📦 Seeding bed_types...')
  const bedTypes = [
    'Single Bed',
    'Double Bed',
    'Twin Bed',
    'King Bed',
    'Queen Bed',
    'Super King Bed',
    'Bunk Bed',
  ]
  for (const name of bedTypes) {
    const existing = await prisma.bed_types.findFirst({
      where: { name, hotel_id: null },
    })
    if (!existing) {
      await prisma.bed_types.create({
        data: { name, is_default: true, hotel_id: null },
      })
    }
  }
  console.log('✅ Bed types seeded')

  // 6. Seed system admin
  console.log('📦 Seeding system admin...')
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@system.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'changeme123'
  const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin'

  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  await prisma.system_admins.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      is_active: true,
      is_blocked: false,
    },
  })
  console.log('✅ System admin seeded')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)

  // 7. Seed Hotel and Hotel Admin
  console.log('📦 Seeding hotel and hotel admin...')
  const sysAdmin = await prisma.system_admins.findUnique({
    where: { email: adminEmail }
  })
  
  if (sysAdmin) {
    const city = await prisma.cities.findUnique({ where: { name: 'Dhaka' } })
    const hotelType = await prisma.hotel_types.findUnique({ where: { name: 'Hotel' } })

    const hotel = await prisma.hotels.upsert({
      where: { slug: 'grand-dhaka-hotel' },
      update: {},
      create: {
        name: 'Grand Dhaka Hotel',
        slug: 'grand-dhaka-hotel',
        email: 'info@granddhaka.com',
        address: '123 Main Street, Dhaka',
        city_id: city?.id,
        hotel_type_id: hotelType?.id,
        created_by: sysAdmin.id,
        approval_status: 'PUBLISHED',
      }
    })

    const hotelAdminEmail = 'hotel@dhaka.com'
    const hotelAdminPassword = 'hotel123'
    const hashedHotelAdminPassword = await bcrypt.hash(hotelAdminPassword, 10)

    await prisma.hotel_admins.upsert({
      where: { email: hotelAdminEmail },
      update: {},
      create: {
        name: 'Grand Dhaka Admin',
        email: hotelAdminEmail,
        password: hashedHotelAdminPassword,
        hotel_id: hotel.id,
        created_by: sysAdmin.id,
        role_id: 1,
        is_active: true,
      }
    })
    console.log('   Hotel and Hotel Admin seeded')
    console.log(`   Hotel Admin Email: ${hotelAdminEmail}`)
    console.log(`   Hotel Admin Password: ${hotelAdminPassword}`)
  }

  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })