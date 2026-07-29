// filepath: src/app/api/system-admin/hotels/route.ts
// GET: List all hotels with filtering, search, sorting, pagination
// POST: Create hotel + owner + admin + documents (one form submission, one transaction)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createHotelSchema } from '@/lib/validations/hotel'
import { slugify } from '@/lib/utils'
import bcrypt from 'bcryptjs'


type ApprovalStatus = 'UNPUBLISHED' | 'PUBLISHED' | 'SUSPENDED'
type DocumentType = 'TRADE_LICENSE' | 'TAX_CERTIFICATE' | 'TIN_CERTIFICATE' | 'VAT_CERTIFICATE' | 'BUSINESS_DOCUMENT' | 'OWNER_DOCUMENT' | 'ADMIN_DOCUMENT'

type SortOrder = 'asc' | 'desc'

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

    const where: any = {
      deleted_at: null,
      name: { contains: search },
    }

    if (status && ['UNPUBLISHED', 'PUBLISHED', 'SUSPENDED'].includes(status)) where.approval_status = status
    if (cityId) where.city_id = parseInt(cityId)
    if (hotelTypeId) where.hotel_type_id = parseInt(hotelTypeId)

    let orderBy: any = { created_at: 'desc' }
    if (sortBy === 'name') orderBy = { name: order }
    else if (sortBy === 'created') orderBy = { created_at: order }
    else if (sortBy === 'status') orderBy = { approval_status: order }

    const [hotels, total] = await Promise.all([
      prisma.hotels.findMany({
        where,
        skip,
        take: limit,
        include: {
          city: true,
          hotel_type: true,
          hotel_admin: { select: { id: true, name: true, email: true } },
          detail: { select: { star_rating: true } },
          owner_detail: { select: { full_name: true } },
          cases: { where: { status: 'PENDING' }, select: { id: true }, take: 1 },
        },
        orderBy,
      }),
      prisma.hotels.count({ where }),
    ])

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const stats = await prisma.user_bookings.groupBy({
      by: ['hotel_id'],
      where: { hotel_id: { in: hotels.map((h: (typeof hotels)[number]) => h.id) }, created_at: { gte: thirtyDaysAgo } },
      _count: { id: true },
      _sum: { total_price: true },
    })
    const statsByHotel = new Map<number, { _count: { id: number }; _sum: { total_price: any } }>(
      stats.map((s: any) => [s.hotel_id, s]),
    )

    const hotelsWithDetails = hotels.map((hotel: (typeof hotels)[number]) => {
      const stat = statsByHotel.get(hotel.id)
      return {
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        city: hotel.city,
        hotelType: hotel.hotel_type,
        starRating: hotel.detail?.star_rating ? parseFloat(hotel.detail.star_rating.toString()) : null,
        owner: hotel.owner_detail?.full_name ?? null,
        hotelAdmin: hotel.hotel_admin,
        hasPendingCase: hotel.cases.length > 0,
        bookings30d: stat?._count.id ?? 0,
        revenue30d: stat?._sum.total_price ? parseFloat(stat._sum.total_price.toString()) : 0,
        approval_status: hotel.approval_status,
        createdAt: hotel.created_at.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        hotels: hotelsWithDetails,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('Failed to fetch hotels:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// Document URLs must end in .pdf or .jpg — not .jpeg, even though they share
// a MIME type. Extension-checked here as a server-side backstop; the page
// also restricts the file input's accept attribute client-side.
const ALLOWED_DOC_EXT = /\.(pdf|jpg)$/i

function validateDocUrl(url: string | undefined, label: string): string | null {
  if (!url) return null
  if (!ALLOWED_DOC_EXT.test(url)) {
    return `${label} must be a .pdf or .jpg file.`
  }
  return null
}

const DOC_TYPE_MAP: Record<string, DocumentType> = {
  trade_license_url: 'TRADE_LICENSE',
  tax_certificate_url: 'TAX_CERTIFICATE',
  tin_certificate_url: 'TIN_CERTIFICATE',
  vat_certificate_url: 'VAT_CERTIFICATE',
  business_document_url: 'BUSINESS_DOCUMENT',
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
        { status: 400 },
      )
    }

    const { hotel, details, owner, admin, documents } = result.data

    // Document extension check (pdf/jpg only)
    if (documents) {
      const docErrors = Object.entries(documents)
        .map(([key, url]) => validateDocUrl(url as string | undefined, key))
        .filter(Boolean)
      if (docErrors.length > 0) {
        return NextResponse.json({ success: false, message: docErrors.join(' ') }, { status: 400 })
      }
    }

    const [existingHotelAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email: admin.admin_email } }),
      prisma.system_admins.findUnique({ where: { email: admin.admin_email } }),
    ])

    if (existingHotelAdmin || existingSysAdmin) {
      return NextResponse.json({ success: false, message: 'Admin email is already in use' }, { status: 400 })
    }

    let slug = slugify(hotel.name)
    let count = 1
    while (await prisma.hotels.findUnique({ where: { slug } })) {
      slug = `${slugify(hotel.name)}-${count}`
      count++
    }

    const hashedPassword = await bcrypt.hash(admin.admin_password, 10)

    const createdHotel = await prisma.$transaction(async (tx) => {
      const newHotel = await tx.hotels.create({
        data: {
          name: hotel.name,
          slug,
          email: hotel.email,
          address: hotel.address,
          zip_code: hotel.zip_code,
          map_location: hotel.map_location,
          city_id: hotel.city_id,
          hotel_type_id: hotel.hotel_type_id,
          created_by: auth.payload.actor_id,
          approval_status: 'UNPUBLISHED',
        },
      })

      await tx.hotel_details.create({
        data: {
          hotel_id: newHotel.id,
          star_rating: details.star_rating,
          website: details.website,
          reception_no1: details.reception_no1,
          reception_no2: details.reception_no2,
          emergency_contact_name: details.emergency_contact_name,
          emergency_contact_designation: details.emergency_contact_designation,
          emergency_contact_phone1: details.emergency_contact_phone1,
          emergency_contact_phone2: details.emergency_contact_phone2,
          emergency_contact_email: details.emergency_contact_email,
        },
      })

      const ownerDetail = await tx.hotel_owner_details.create({
        data: {
          hotel_id: newHotel.id,
          full_name: owner.full_name,
          phone: owner.phone,
          address: owner.address,
          dob: owner.dob ? new Date(owner.dob) : null,
          nid_no: owner.nid_no || null,
          passport: owner.passport || null,
          email: owner.email || null,
        },
      })

      if (owner.photo_url) {
        await tx.hotel_owner_images.create({
          data: { hotel_owner_detail_id: ownerDetail.id, image_url: owner.photo_url },
        })
      }

      const newAdmin = await tx.hotel_admins.create({
        data: {
          hotel_id: newHotel.id,
          name: admin.admin_name,
          email: admin.admin_email,
          password: hashedPassword,
          role_id: 1,
          created_by: auth.payload.actor_id,
          is_active: true,
          is_blocked: false,
        },
      })

      await tx.hotel_admin_details.create({
        data: {
          hotel_admin_id: newAdmin.id,
          phone: admin.admin_phone,
          dob: admin.dob ? new Date(admin.dob) : null,
          nid_no: admin.nid_no || null,
          passport: admin.passport || null,
          address: admin.address || null,
          emergency_contact1: admin.emergency_phone || null,
        },
      })

      if (admin.photo_url) {
        await tx.hotel_admin_images.create({
          data: { hotel_admin_id: newAdmin.id, image_url: admin.photo_url },
        })
      }

      if (documents) {
        for (const [key, url] of Object.entries(documents)) {
          if (url) {
            await tx.hotel_documents.create({
              data: {
                hotel_id: newHotel.id,
                document_type: DOC_TYPE_MAP[key],
                file_url: url as string,
              },
            })
          }
        }
      }

      return newHotel
    })

    return NextResponse.json({
      success: true,
      message: 'Hotel created successfully',
      data: { hotel_id: createdHotel.id },
    })
  } catch (error) {
    console.error('Failed to create hotel:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}