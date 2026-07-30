import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)
    if (isNaN(hotelId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const staff = await prisma.hotel_sub_admins.findMany({
      where: { hotel_id: hotelId, deleted_at: null },
      select: { id: true, name: true, email: true, is_active: true, is_blocked: true, last_login_at: true },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, data: staff })
  } catch (error) {
    console.error('Failed to fetch hotel staff:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}