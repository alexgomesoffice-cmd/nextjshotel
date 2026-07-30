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

    const logs = await prisma.hotel_admin_activity_logs.findMany({
      where: { hotel_id: hotelId },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Failed to fetch hotel activity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}