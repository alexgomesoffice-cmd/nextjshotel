import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createHotelSchema } from '@/lib/validations/hotel'
import { slugify } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') as 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | null
    const sortBy = searchParams.get('sortBy') || 'created'
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
    const cityId = searchParams.get('city_id')
    const hotelTypeId = searchParams.get('hotel_type_id')

    const skip = (page - 1) * limit

    const where: Prisma.hotelsWhereInput = {
      deleted_at: null,
      name: { contains: search },
    }

    if (status) where.approval_status = status
    if (cityId) where.city_id = parseInt(cityId)
    if (hotelTypeId) where.hotel_type_id = parseInt(hotelTypeId)

    // Build orderBy
    let orderBy: Prisma.hotelsOrderByWithRelationInput = { created_at: 'desc' }
    if (sortBy === 'name') {
      orderBy = { name: order as 'asc' | 'desc' }
    } else if (sortBy === 'created') {
      orderBy = { created_at: order as 'asc' | 'desc' }
    } else if (sortBy === 'status') {
      orderBy = { approval_status: order as 'asc' | 'desc' }
    }

    const [hotels, total] = await Promise.all([
      prisma.hotels.findMany({
        where,
        skip,
        take: limit,
        include: {
          city: true,
          hotel_type: true,
          hotel_admin: {
            select: { id: true, name: true, email: true },
          },
          detail: {
            select: { star_rating: true },
          },
        },
        orderBy,
      }),
      prisma.hotels.count({ where }),
    ])

    const hotelsWithDetails = hotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      city: hotel.city,
      hotelType: hotel.hotel_type,
      starRating: hotel.detail?.star_rating ? parseFloat(hotel.detail.star_rating.toString()) : null,
      approval_status: hotel.approval_status,
      createdAt: hotel.created_at.toISOString(),
      hotelAdmin: hotel.hotel_admin,
    }))

    return NextResponse.json({
      success: true,
      data: {
        hotels: hotelsWithDetails,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch hotels:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createHotelSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { hotel, details, admin } = result.data

    // Check if email is already in use by any admin
    const [existingHotelAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email: admin.email } }),
      prisma.system_admins.findUnique({ where: { email: admin.email } }),
    ])

    if (existingHotelAdmin || existingSysAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin email is already in use' },
        { status: 400 }
      )
    }

    // Generate unique slug
    let slug = slugify(hotel.name)
    let count = 1
    while (await prisma.hotels.findUnique({ where: { slug } })) {
      slug = `${slugify(hotel.name)}-${count}`
      count++
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(admin.password, 10)

    // Transaction to create hotel, details, and admin
    const createdHotel = await prisma.$transaction(async (tx) => {
      const newHotel = await tx.hotels.create({
        data: {
          ...hotel,
          slug,
          created_by: auth.payload.actor_id,
          approval_status: 'DRAFT',
          detail: {
            create: details,
          },
          hotel_admin: {
            create: {
              name: admin.name,
              email: admin.email,
              password: hashedPassword,
              role_id: 1, // HOTEL_ADMIN
              created_by: auth.payload.actor_id,
            },
          },
        },
      })

      return newHotel
    })

    return NextResponse.json({
      success: true,
      message: 'Hotel and admin created successfully',
      data: { hotel_id: createdHotel.id },
    })
  } catch (error) {
    console.error('Failed to create hotel:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
