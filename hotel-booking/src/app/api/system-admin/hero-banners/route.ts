import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const banners = await prisma.hero_banners.findMany({
      orderBy: { slot: 'asc' }
    })

    return NextResponse.json({ success: true, data: banners })
  } catch (error) {
    console.error('Fetch hero banners error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
