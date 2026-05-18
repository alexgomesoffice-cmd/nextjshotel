import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createStaffSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''

    const staff = await prisma.hotel_sub_admins.findMany({
      where: {
        hotel_id: payload.hotel_id,
        deleted_at: null,
        ...(search ? {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    const serialized = staff.map(s => ({
      ...s,
      last_login_at: s.last_login_at?.toISOString() ?? null,
      created_at:    s.created_at.toISOString(),
    }))

    return NextResponse.json({ success: true, data: serialized })
  } catch (err) {
    console.error('[hotel-admin] GET /staff error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const validation = createStaffSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.data

    const [existingHotelAdmin, existingSubAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({ where: { email } }),
      prisma.hotel_sub_admins.findFirst({ where: { email, deleted_at: null } }),
      prisma.system_admins.findUnique({ where: { email } }),
    ])

    if (existingHotelAdmin || existingSubAdmin || existingSysAdmin) {
      return NextResponse.json(
        { success: false, message: 'This email is already in use' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const staff = await prisma.hotel_sub_admins.create({
      data: {
        hotel_id:   payload.hotel_id!,
        name,
        email,
        password:   hashedPassword,
        role_id:    2,
        created_by: payload.actor_id,
        is_active:  true,
        is_blocked: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...staff, created_at: staff.created_at.toISOString() },
      message: 'Staff member created successfully',
    })
  } catch (err) {
    console.error('[hotel-admin] POST /staff error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
