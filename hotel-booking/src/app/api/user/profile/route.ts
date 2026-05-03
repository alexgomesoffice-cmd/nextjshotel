import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  detail: z.object({
    dob: z.string().optional().nullable(),
    gender: z.enum(['Male', 'Female', 'Other']).optional().nullable(),
    phone: z.string().max(32).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    nid_no: z.string().max(50).optional().nullable(),
    passport: z.string().max(50).optional().nullable(),
    emergency_contact: z.string().max(100).optional().nullable(),
  }).optional(),
})

/**
 * GET /api/user/profile
 * requireAuth(['END_USER'])
 * Returns: end_user + end_user_details + active profile image
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['END_USER'])
    if (auth.error) return auth.error

    const userId = auth.payload.actor_id

    const user = await prisma.end_users.findUnique({
      where: { id: userId, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        email_verified: true,
        created_at: true,
        detail: {
          select: {
            dob: true,
            gender: true,
            phone: true,
            address: true,
            country: true,
            nid_no: true,
            passport: true,
            emergency_contact: true,
          },
        },
        images: {
          where: { is_active: true },
          take: 1,
          orderBy: { created_at: 'desc' },
          select: { id: true, image_url: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/user/profile
 * requireAuth(['END_USER'])
 * Updates end_user name and/or end_user_details fields.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['END_USER'])
    if (auth.error) return auth.error

    const userId = auth.payload.actor_id
    const body = await req.json()
    const result = updateProfileSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { name, detail } = result.data

    // Run updates in parallel
    const updates: Promise<unknown>[] = []

    if (name) {
      updates.push(
        prisma.end_users.update({
          where: { id: userId },
          data: { name },
        })
      )
    }

    if (detail && Object.keys(detail).length > 0) {
      const detailData: Record<string, unknown> = {}
      if (detail.dob !== undefined) detailData.dob = detail.dob ? new Date(detail.dob) : null
      if (detail.gender !== undefined) detailData.gender = detail.gender
      if (detail.phone !== undefined) detailData.phone = detail.phone
      if (detail.address !== undefined) detailData.address = detail.address
      if (detail.country !== undefined) detailData.country = detail.country
      if (detail.nid_no !== undefined) detailData.nid_no = detail.nid_no
      if (detail.passport !== undefined) detailData.passport = detail.passport
      if (detail.emergency_contact !== undefined) detailData.emergency_contact = detail.emergency_contact

      updates.push(
        prisma.end_user_details.upsert({
          where: { end_user_id: userId },
          create: { end_user_id: userId, ...detailData },
          update: detailData,
        })
      )
    }

    await Promise.all(updates)

    // Return updated profile
    const updated = await prisma.end_users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        detail: {
          select: {
            dob: true, gender: true, phone: true,
            address: true, country: true, nid_no: true,
            passport: true, emergency_contact: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, message: 'Profile updated', data: updated })
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
