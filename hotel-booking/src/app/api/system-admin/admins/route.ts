import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createSystemAdminSchema } from '@/lib/validations/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const admins = await prisma.system_admins.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        created_at: true,
        last_login_at: true,
        creator: { select: { name: true } },
        detail: { select: { phone: true, dob: true } },
        images: { select: { image_url: true }, take: 1, orderBy: { created_at: 'desc' } },
      },
      orderBy: { created_at: 'desc' },
    })

    const data = admins.map((a: (typeof admins)[number]) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      is_active: a.is_active,
      is_blocked: a.is_blocked,
      created_at: a.created_at,
      last_login_at: a.last_login_at,
      created_by: a.creator?.name ?? null,
      phone: a.detail?.phone ?? null,
      image_url: a.images[0]?.image_url ?? null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to fetch system admins:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/system-admin/admins
// Creates the login row + identity details + photo in one transaction.
// Any system admin can create another with identical abilities — flat,
// no hierarchy. Confirm-password is a client-side-only safeguard; only
// `password` is ever sent here.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createSystemAdminSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 },
      )
    }

    const { name, email, password, phone, dob, address, nid_no, gender, passport, image_url } = result.data

    const [existingHotelAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email } }),
      prisma.system_admins.findUnique({ where: { email } }),
    ])

    if (existingHotelAdmin || existingSysAdmin) {
      return NextResponse.json({ success: false, message: 'Admin email is already in use' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newAdmin = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const admin = await tx.system_admins.create({
        data: {
          name,
          email,
          password: hashedPassword,
          created_by: auth.payload.actor_id,
          is_active: true,
        },
      })

      await tx.system_admin_details.create({
        data: {
          system_admin_id: admin.id,
          phone,
          dob: new Date(dob),
          address,
          nid_no,
          gender: gender || null,
          passport: passport || null,
        },
      })

      if (image_url) {
        await tx.system_admin_images.create({
          data: { system_admin_id: admin.id, image_url },
        })
      }

      return admin
    })

    return NextResponse.json({
      success: true,
      message: 'System admin created successfully',
      data: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email },
    })
  } catch (error) {
    console.error('Failed to create system admin:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}