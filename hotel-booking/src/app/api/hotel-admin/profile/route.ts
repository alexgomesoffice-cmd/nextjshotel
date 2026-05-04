import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const profileSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  dob: z.string().nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  nid_no: z.string().max(50).nullable().optional(),
  passport: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  manager_name: z.string().max(150).nullable().optional(),
  manager_phone: z.string().max(32).nullable().optional(),
  emergency_contact1: z.string().max(100).nullable().optional(),
  emergency_contact2: z.string().max(100).nullable().optional(),
  current_password: z.string().min(6).optional(),
  new_password: z.string().min(6).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const adminId = auth.payload.actor_id

    const admin = await prisma.hotel_admins.findUnique({
      where: { id: adminId },
      include: {
        detail: true
      }
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
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const data = result.success ? result.data : {}
    const adminData: any = {}
    if (data.name !== undefined) adminData.name = data.name

    // Password Update Logic
    if (data.new_password) {
      if (!data.current_password) {
        return NextResponse.json({ success: false, message: 'Current password is required to set a new password' }, { status: 400 })
      }

      const admin = await prisma.hotel_admins.findUnique({
        where: { id: adminId },
        select: { password: true }
      })

      if (!admin) {
        return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 })
      }

      const isValid = await bcrypt.compare(data.current_password, admin.password)
      if (!isValid) {
        return NextResponse.json({ success: false, message: 'Current password does not match' }, { status: 400 })
      }

      adminData.password = await bcrypt.hash(data.new_password, 10)
    }

    const detailData: any = { ...data }
    delete detailData.name
    delete detailData.current_password
    delete detailData.new_password
    
    // Format date if present
    if (detailData.dob !== undefined) {
      if (detailData.dob && detailData.dob.trim() !== '') {
        const date = new Date(detailData.dob)
        if (!isNaN(date.getTime())) {
          detailData.dob = date
        } else {
          detailData.dob = null
        }
      } else {
        detailData.dob = null
      }
    }

    await prisma.$transaction([
      prisma.hotel_admins.update({
        where: { id: adminId },
        data: adminData
      }),
      prisma.hotel_admin_details.upsert({
        where: { hotel_admin_id: adminId },
        create: { hotel_admin_id: adminId, ...detailData },
        update: detailData
      })
    ])

    return NextResponse.json({ success: true, message: 'Profile updated' })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
