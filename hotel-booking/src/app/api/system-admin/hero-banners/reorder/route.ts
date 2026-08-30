import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const { orderedIds } = body

    if (!Array.isArray(orderedIds) || orderedIds.length !== 5) {
      return NextResponse.json(
        { success: false, message: 'Must provide exactly 5 ordered banner IDs.' },
        { status: 400 }
      )
    }

    // Check for duplicates
    if (new Set(orderedIds).size !== 5) {
      return NextResponse.json(
        { success: false, message: 'Duplicate IDs provided.' },
        { status: 400 }
      )
    }

    // Verify all 5 exist
    const existing = await prisma.hero_banners.findMany({
      where: { id: { in: orderedIds } }
    })

    if (existing.length !== 5) {
      return NextResponse.json(
        { success: false, message: 'One or more provided banner IDs do not exist.' },
        { status: 400 }
      )
    }

    // Reorder using transaction with temporary negative slots to prevent unique constraint violations
    await prisma.$transaction(async (tx) => {
      // 1. Move to temporary negative slots
      for (const banner of existing) {
        await tx.hero_banners.update({
          where: { id: banner.id },
          data: { slot: -banner.id } // safe temporary unique value
        })
      }

      // 2. Set final slots based on array order (index 0 = slot 1, etc.)
      for (let i = 0; i < 5; i++) {
        await tx.hero_banners.update({
          where: { id: orderedIds[i] },
          data: { slot: i + 1 }
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Banners reordered successfully' })
  } catch (error) {
    console.error('Reorder hero banners error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
