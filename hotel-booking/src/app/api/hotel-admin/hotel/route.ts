import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateHotelSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  slug: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  star_rating: z.number().min(1).max(5).nullable().optional(),
  email: z.string().email().nullable().optional(),
  emergency_contact1: z.string().max(100).nullable().optional(),
  emergency_contact2: z.string().max(100).nullable().optional(),
  
  // Details
  description: z.string().nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  reception_no1: z.string().max(32).nullable().optional(),
  reception_no2: z.string().max(32).nullable().optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  advance_deposit_percent: z.number().min(0).max(100).optional(),
  cancellation_policy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM']).optional(),
  cancellation_hours: z.number().min(0).nullable().optional(),
  refund_percent: z.number().min(0).max(100).nullable().optional(),
  website: z.string().max(255).nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const hotel = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      include: {
        city: { select: { id: true, name: true } },
        hotel_type: { select: { id: true, name: true } },
        detail: true,
        images: {
          orderBy: { sort_order: 'asc' },
          select: { id: true, image_url: true, is_cover: true, sort_order: true }
        },
        hotel_amenities: {
          include: {
            amenity: { select: { id: true, name: true, icon: true } }
          }
        }
      }
    })

    if (!hotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: hotel })
  } catch (error) {
    console.error('Failed to fetch hotel details:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const body = await req.json()
    const result = updateHotelSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const data = result.data

    // Split updates into base hotel fields and details fields
    const hotelData: any = {}
    if (data.name !== undefined) hotelData.name = data.name
    if (data.slug !== undefined) hotelData.slug = data.slug
    if (data.address !== undefined) hotelData.address = data.address
    if (data.latitude !== undefined) hotelData.latitude = data.latitude
    if (data.longitude !== undefined) hotelData.longitude = data.longitude
    if (data.email !== undefined) hotelData.email = data.email
    if (data.emergency_contact1 !== undefined) hotelData.emergency_contact1 = data.emergency_contact1
    if (data.emergency_contact2 !== undefined) hotelData.emergency_contact2 = data.emergency_contact2

    const detailsData: any = {}
    if (data.star_rating !== undefined) detailsData.star_rating = data.star_rating
    if (data.description !== undefined) detailsData.description = data.description
    if (data.short_description !== undefined) detailsData.short_description = data.short_description
    if (data.reception_no1 !== undefined) detailsData.reception_no1 = data.reception_no1
    if (data.reception_no2 !== undefined) detailsData.reception_no2 = data.reception_no2
    if (data.check_in_time !== undefined) detailsData.check_in_time = data.check_in_time
    if (data.check_out_time !== undefined) detailsData.check_out_time = data.check_out_time
    if (data.advance_deposit_percent !== undefined) detailsData.advance_deposit_percent = data.advance_deposit_percent
    if (data.cancellation_policy !== undefined) detailsData.cancellation_policy = data.cancellation_policy
    if (data.cancellation_hours !== undefined) detailsData.cancellation_hours = data.cancellation_hours
    if (data.refund_percent !== undefined) detailsData.refund_percent = data.refund_percent
    if (data.website !== undefined) detailsData.website = data.website

    const updates: Prisma.PrismaPromise<any>[] = []

    if (Object.keys(hotelData).length > 0) {
      updates.push(
        prisma.hotels.update({
          where: { id: hotelId },
          data: hotelData
        })
      )
    }

    if (Object.keys(detailsData).length > 0) {
      updates.push(
        prisma.hotel_details.upsert({
          where: { hotel_id: hotelId },
          create: { hotel_id: hotelId, ...detailsData },
          update: detailsData
        })
      )
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates)
    }

    // Return the updated hotel
    const updatedHotel = await prisma.hotels.findUnique({
      where: { id: hotelId },
      include: { detail: true }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Hotel details updated successfully',
      data: updatedHotel 
    })
  } catch (error) {
    console.error('Failed to update hotel details:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
