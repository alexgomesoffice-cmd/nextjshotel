import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateCitySchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/system-admin/cities/[id] ───────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const cityId = parseInt(id)
    if (isNaN(cityId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const city = await prisma.cities.findUnique({
      where: { id: cityId },
      include: { _count: { select: { hotels: true } } },
    })

    if (!city) {
      return NextResponse.json({ success: false, message: 'City not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: city })
  } catch (error) {
    console.error('Failed to fetch city:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const cityId = parseInt(id)

    const body = await req.json()
    const result = updateCitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const cityExists = await prisma.cities.findUnique({ where: { id: cityId } })
    if (!cityExists) {
      return NextResponse.json({ success: false, message: 'City not found' }, { status: 404 })
    }

    const updatedCity = await prisma.cities.update({
      where: { id: cityId },
      data: result.data,
    })

    return NextResponse.json({ success: true, message: 'City updated', data: updatedCity })
  } catch (error) {
    console.error('Failed to update city:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/system-admin/cities/[id] ───────────────────────────────────
// Deactivates city if hotels reference it; hard deletes if city is unused.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const cityId = parseInt(id)
    if (isNaN(cityId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const city = await prisma.cities.findUnique({
      where: { id: cityId },
      include: { _count: { select: { hotels: true } } },
    })

    if (!city) {
      return NextResponse.json({ success: false, message: 'City not found' }, { status: 404 })
    }

    if (city._count.hotels > 0) {
      // Hotels exist in this city — deactivate only
      await prisma.cities.update({
        where: { id: cityId },
        data: { is_active: false },
      })
      return NextResponse.json({
        success: true,
        message: `City deactivated. ${city._count.hotels} hotel(s) reference it and it cannot be permanently deleted.`,
      })
    }

    // No hotels → safe hard delete
    await prisma.cities.delete({ where: { id: cityId } })
    return NextResponse.json({ success: true, message: 'City deleted permanently' })
  } catch (error) {
    console.error('Failed to delete city:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
