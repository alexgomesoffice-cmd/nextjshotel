import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateCitySchema } from '@/lib/validations/metadata'

type Params = {
  params: Promise<{ id: string }>
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
