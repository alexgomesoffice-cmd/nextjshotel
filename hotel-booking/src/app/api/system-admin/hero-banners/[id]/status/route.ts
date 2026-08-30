import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const resolvedParams = await params
    const bannerId = parseInt(resolvedParams.id)

    if (isNaN(bannerId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ success: false, message: 'is_active boolean is required' }, { status: 400 })
    }

    const updatedBanner = await prisma.hero_banners.update({
      where: { id: bannerId },
      data: { is_active: body.is_active }
    })

    return NextResponse.json({ success: true, message: 'Banner status updated', data: updatedBanner })
  } catch (error) {
    console.error('Update hero banner status error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
