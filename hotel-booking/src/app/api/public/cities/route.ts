import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cities = await prisma.cities.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
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
