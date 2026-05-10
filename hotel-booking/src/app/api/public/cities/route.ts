import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    const cities = await prisma.cities.findMany({
      where: {
        is_active: true,
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: { name: 'asc' },
      take: q ? 8 : undefined, // limit suggestions to 8 when searching
    })

    return NextResponse.json({ success: true, data: cities })
  } catch (error) {
    console.error('Failed to fetch cities:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
