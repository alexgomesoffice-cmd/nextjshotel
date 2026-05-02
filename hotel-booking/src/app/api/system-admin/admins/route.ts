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
        creator: {
          select: { name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, data: admins })
  } catch (error) {
    console.error('Failed to fetch system admins:', error)
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
    const result = createSystemAdminSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { name, email, password } = result.data

    // Check if email is already in use by any admin
    const [existingHotelAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email } }),
      prisma.system_admins.findUnique({ where: { email } }),
    ])

    if (existingHotelAdmin || existingSysAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin email is already in use' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const newAdmin = await prisma.system_admins.create({
      data: {
        name,
        email,
        password: hashedPassword,
        created_by: auth.payload.actor_id,
        is_active: true,
      },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({
      success: true,
      message: 'System admin created successfully',
      data: newAdmin,
    })
  } catch (error) {
    console.error('Failed to create system admin:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
