import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateHotelSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  slug: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  map_location: z.string().nullable().optional(),
  star_rating: z.number().min(1).max(5).nullable().optional(),
  email: z.string().email().nullable().optional(),

  // Details
  description: z.string().nullable().optional(),
  reception_no1: z.string().max(32).nullable().optional(),
  reception_no2: z.string().max(32).nullable().optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  advance_deposit_percent: z.number().min(0).max(100).optional(),
  website: z.string().max(255).nullable().optional(),
  emergency_contact_name: z.string().max(150).nullable().optional(),
  emergency_contact_designation: z.string().max(100).nullable().optional(),
  emergency_contact_phone1: z.string().max(32).nullable().optional(),
  emergency_contact_phone2: z.string().max(32).nullable().optional(),
  emergency_contact_email: z.string().email().nullable().optional(),
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
    if (data.map_location !== undefined) hotelData.map_location = data.map_location
    if (data.email !== undefined) hotelData.email = data.email

    const detailsData: any = {}
    if (data.star_rating !== undefined) detailsData.star_rating = data.star_rating
    if (data.description !== undefined) detailsData.description = data.description
    if (data.reception_no1 !== undefined) detailsData.reception_no1 = data.reception_no1
    if (data.reception_no2 !== undefined) detailsData.reception_no2 = data.reception_no2
    if (data.check_in_time !== undefined) detailsData.check_in_time = data.check_in_time
    if (data.check_out_time !== undefined) detailsData.check_out_time = data.check_out_time
    if (data.advance_deposit_percent !== undefined) detailsData.advance_deposit_percent = data.advance_deposit_percent
    if (data.website !== undefined) detailsData.website = data.website
    if (data.emergency_contact_name !== undefined) detailsData.emergency_contact_name = data.emergency_contact_name
    if (data.emergency_contact_designation !== undefined) detailsData.emergency_contact_designation = data.emergency_contact_designation
    if (data.emergency_contact_phone1 !== undefined) detailsData.emergency_contact_phone1 = data.emergency_contact_phone1
    if (data.emergency_contact_phone2 !== undefined) detailsData.emergency_contact_phone2 = data.emergency_contact_phone2
    if (data.emergency_contact_email !== undefined) detailsData.emergency_contact_email = data.emergency_contact_email

    const updates: any[] = []

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