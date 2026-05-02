import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateUserSchema } from '@/lib/validations/auth'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const userId = parseInt(id)

    const user = await prisma.end_users.findUnique({
      where: { id: userId, deleted_at: null },
      include: {
        detail: true,
        images: {
          orderBy: { created_at: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    // Exclude password from response
    const { password, ...userWithoutPassword } = user
    
    return NextResponse.json({ success: true, data: userWithoutPassword })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const userId = parseInt(id)

    const body = await req.json()
    const result = updateUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const userExists = await prisma.end_users.findUnique({ where: { id: userId, deleted_at: null } })
    if (!userExists) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const updatedUser = await prisma.end_users.update({
      where: { id: userId },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        updated_at: true,
      },
    })

    return NextResponse.json({ success: true, message: 'User updated', data: updatedUser })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
