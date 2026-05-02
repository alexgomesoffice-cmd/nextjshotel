import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateSystemAdminSchema } from '@/lib/validations/auth'

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const adminId = parseInt(id)

    const admin = await prisma.system_admins.findUnique({
      where: { id: adminId, deleted_at: null },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        created_at: true,
        last_login_at: true,
        creator: {
          select: { name: true },
        },
      },
    })

    if (!admin) {
      return NextResponse.json({ success: false, message: 'System admin not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: admin })
  } catch (error) {
    console.error('Failed to fetch system admin:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const adminId = parseInt(id)

    const body = await req.json()
    const result = updateSystemAdminSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const adminExists = await prisma.system_admins.findUnique({ where: { id: adminId, deleted_at: null } })
    if (!adminExists) {
      return NextResponse.json({ success: false, message: 'System admin not found' }, { status: 404 })
    }

    if (result.data.email && result.data.email !== adminExists.email) {
      const emailInUse = await prisma.system_admins.findUnique({ where: { email: result.data.email } })
      if (emailInUse) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 })
      }
    }

    const updatedAdmin = await prisma.system_admins.update({
      where: { id: adminId },
      data: result.data,
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
      },
    })

    return NextResponse.json({ success: true, message: 'System admin updated', data: updatedAdmin })
  } catch (error) {
    console.error('Failed to update system admin:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
