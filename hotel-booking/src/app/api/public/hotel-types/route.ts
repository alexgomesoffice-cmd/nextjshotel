import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const types = await prisma.hotel_types.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })
    
    return NextResponse.json({ success: true, data: types })
  } catch (error) {
    console.error('Failed to fetch hotel types:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch hotel types' },
      { status: 500 }
    )
  }
}
