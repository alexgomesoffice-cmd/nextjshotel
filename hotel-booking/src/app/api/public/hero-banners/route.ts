import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const banners = await prisma.hero_banners.findMany({
      where: {
        is_active: true,
        image_url: { not: null }
      },
      orderBy: { slot: 'asc' }
    })

    return NextResponse.json({ success: true, data: banners })
  } catch (error) {
    console.error('Fetch public hero banners error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
