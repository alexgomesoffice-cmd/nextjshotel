import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createAmenitySchema } from '@/lib/validations/metadata'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const context = searchParams.get('context') as 'HOTEL' | 'ROOM' | null

    const skip = (page - 1) * limit

    const where: any = {
      is_default: true,
      hotel_id: null,
      name: { contains: search }
    }

    if (context) {
      where.context = context
    }

    const [amenities, total] = await Promise.all([
      prisma.amenities.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.amenities.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        amenities,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch amenities:', error)
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
    const result = createAmenitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { name, icon, context, is_active } = result.data

    const newAmenity = await prisma.amenities.create({
      data: {
        name,
        icon: icon || null,
        context,
        is_active,
        is_default: true,
        hotel_id: null, // System admin creates global default amenities
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Amenity created successfully',
      data: newAmenity,
    })
  } catch (error) {
    console.error('Failed to create amenity:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
