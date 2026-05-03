// filepath: src/app/api/system-admin/hotels/route.ts
// GET: List all hotels with filtering, search, sorting, pagination
// POST: Create hotel + hotel admin (one form submission)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createHotelSchema } from '@/lib/validations/hotel'
import { slugify } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { Prisma, ApprovalStatus } from '@prisma/client'

type SortOrder = 'asc' | 'desc'

// ═══════════════════════════════════════════════════════
// GET /api/system-admin/hotels
// ═══════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') as ApprovalStatus | null
    const sortBy = searchParams.get('sortBy') || 'created'
    const order = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as SortOrder
    const cityId = searchParams.get('city_id')
    const hotelTypeId = searchParams.get('hotel_type_id')

    const skip = (page - 1) * limit

    const where: Prisma.hotelsWhereInput = {
      deleted_at: null,
      name: { contains: search },
    }

    if (status && ['DRAFT', 'PUBLISHED', 'SUSPENDED'].includes(status)) where.approval_status = status
    if (cityId) where.city_id = parseInt(cityId)
    if (hotelTypeId) where.hotel_type_id = parseInt(hotelTypeId)

    // Build orderBy
    let orderBy: Prisma.hotelsOrderByWithRelationInput = { created_at: 'desc' }
    if (sortBy === 'name') {
      orderBy = { name: order }
    } else if (sortBy === 'created') {
      orderBy = { created_at: order }
    } else if (sortBy === 'status') {
      orderBy = { approval_status: order }
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

    const hotelsWithDetails = hotels.map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      slug: hotel.slug,
      city: hotel.city,
      hotelType: hotel.hotel_type,
      starRating: hotel.detail?.star_rating
        ? parseFloat(hotel.detail.star_rating.toString())
        : null,
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

// ═══════════════════════════════════════════════════════
// POST /api/system-admin/hotels — Create hotel + admin
// ═══════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createHotelSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: result.error.issues,
        },
        { status: 400 }
      )
    }

    const { hotel, details, admin } = result.data

    // Check if admin email already exists
    const [existingHotelAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email: admin.admin_email } }),
      prisma.system_admins.findUnique({ where: { email: admin.admin_email } }),
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
    const hashedPassword = await bcrypt.hash(admin.admin_password, 10)

    // Transaction to create hotel, details, and admin
    const createdHotel = await prisma.$transaction(async (tx) => {
      const newHotel = await tx.hotels.create({
        data: {
          name: hotel.name,
          slug,
          email: hotel.email,
          address: hotel.address,
          zip_code: hotel.zip_code,
          owner_name: hotel.owner_name,
          emergency_contact1: hotel.emergency_contact1,
          emergency_contact2: hotel.emergency_contact2,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          city_id: hotel.city_id,
          hotel_type_id: hotel.hotel_type_id,
          created_by: auth.payload.actor_id,
          approval_status: 'DRAFT',
        },
      })

      // Create hotel details
      await tx.hotel_details.create({
        data: {
          hotel_id: newHotel.id,
          description: details.description,
          short_description: details.short_description,
          check_in_time: details.check_in_time,
          check_out_time: details.check_out_time,
          advance_deposit_percent: details.advance_deposit_percent,
          cancellation_policy: details.cancellation_policy,
          cancellation_hours: details.cancellation_hours,
          refund_percent: details.refund_percent,
          reception_no1: details.reception_no1,
          reception_no2: details.reception_no2,
          star_rating: hotel.star_rating,
        },
      })

      // Create hotel admin
      const newAdmin = await tx.hotel_admins.create({
        data: {
          hotel_id: newHotel.id,
          name: admin.admin_name,
          email: admin.admin_email,
          password: hashedPassword,
          role_id: 1, // HOTEL_ADMIN
          created_by: auth.payload.actor_id,
          is_active: true,
          is_blocked: false,
        },
      })

      return { newHotel, newAdmin }
    })

    return NextResponse.json({
      success: true,
      message: 'Hotel and admin created successfully',
      data: { hotel_id: createdHotel.newHotel.id },
    })
  } catch (error) {
    console.error('Failed to create hotel:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}