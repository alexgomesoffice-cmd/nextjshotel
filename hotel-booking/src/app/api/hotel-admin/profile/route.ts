import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150).optional(),
  dob: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string().trim().max(32), z.null()]).optional(),
  nid_no: z.union([z.string().trim().max(50), z.null()]).optional(),
  passport: z.union([z.string().trim().max(50), z.null()]).optional(),
  address: z.union([z.string().trim(), z.null()]).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const adminId = auth.payload.actor_id

    const admin = await prisma.hotel_admins.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        hotel_id: true,
        role_id: true,
        is_active: true,
        is_blocked: true,
        created_at: true,
        detail: true,
      },
    })

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: admin })
  } catch (error) {
    console.error('Fetch profile error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const adminId = auth.payload.actor_id
    const body = await req.json()
    const result = profileSchema.safeParse(body)

    if (!result.success) {
      const issue = result.error.issues[0]
      return NextResponse.json({
        success: false,
        message: issue?.message || 'Validation error',
      }, { status: 400 })
    }

    const data = result.data
    const adminData: { name?: string } = {}

    if (data.name !== undefined) {
      adminData.name = data.name.trim()
    }

    const detailData: Record<string, string | Date | null> = {}

    const normalizeOptionalString = (value: string | null | undefined) => {
      if (value === undefined) return undefined
      const trimmed = value?.trim?.() ?? value
      return trimmed ? trimmed : null
    }

    if (data.phone !== undefined) {
      detailData.phone = normalizeOptionalString(data.phone) ?? null
    }

    if (data.nid_no !== undefined) {
      detailData.nid_no = normalizeOptionalString(data.nid_no) ?? null
    }

    if (data.passport !== undefined) {
      detailData.passport = normalizeOptionalString(data.passport) ?? null
    }

    if (data.address !== undefined) {
      detailData.address = normalizeOptionalString(data.address) ?? null
    }

    if (data.dob !== undefined) {
      if (data.dob && data.dob.trim() !== '') {
        const date = new Date(data.dob)
        detailData.dob = Number.isNaN(date.getTime()) ? null : date
      } else {
        detailData.dob = null
      }
    }

    const hasAdminChanges = Object.keys(adminData).length > 0
    const hasDetailChanges = Object.keys(detailData).length > 0

    if (!hasAdminChanges && !hasDetailChanges) {
      return NextResponse.json({ success: true, message: 'No profile changes to save' })
    }

    await prisma.$transaction(async (tx) => {
      if (hasAdminChanges) {
        await tx.hotel_admins.update({
          where: { id: adminId },
          data: adminData,
        })
      }

      if (hasDetailChanges) {
        await tx.hotel_admin_details.upsert({
          where: { hotel_admin_id: adminId },
          create: { hotel_admin_id: adminId, ...detailData },
          update: detailData,
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ success: false, message: 'Unable to update profile. Please try again.' }, { status: 500 })
  }
}
