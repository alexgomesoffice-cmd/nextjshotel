import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: Promise<{ type: string; id: string }> }

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(), // ignored for HOTEL_ADMIN — locked
  is_active: z.boolean().optional(),
  is_blocked: z.boolean().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

function tableFor(type: string) {
  if (type === 'hotel-admin') return { model: prisma.hotel_admins, detailModel: prisma.hotel_admin_details, fk: 'hotel_admin_id' as const, emailLocked: true }
  if (type === 'hotel-sub-admin') return { model: prisma.hotel_sub_admins, detailModel: prisma.hotel_sub_admin_details, fk: 'hotel_sub_admin_id' as const, emailLocked: false }
  return { model: prisma.end_users, detailModel: prisma.end_user_details, fk: 'end_user_id' as const, emailLocked: false }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { type, id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const { model } = tableFor(type)
    const include: any =
      type === 'hotel-admin' || type === 'hotel-sub-admin'
        ? { detail: true, hotel: { select: { id: true, name: true } } }
        : { detail: true }

    const user = await (model as any).findUnique({ where: { id: userId }, include })
    if (!user) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// PATCH handles both edits and the block/unblock toggle (is_blocked is just
// another field here) — System Admin direct action, goes live immediately.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { type, id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const result = patchSchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const { model, detailModel, fk, emailLocked } = tableFor(type)
    const { name, email, is_active, is_blocked, phone, address } = result.data

    const existing = await (model as any).findUnique({ where: { id: userId } })
    if (!existing) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })

    if (email !== undefined && emailLocked) {
      return NextResponse.json({ success: false, message: 'Email is permanently locked for this account type.' }, { status: 400 })
    }

    await (model as any).update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined && !emailLocked ? { email } : {}),
        ...(is_active !== undefined ? { is_active } : {}),
        ...(is_blocked !== undefined ? { is_blocked } : {}),
      },
    })

    if (phone !== undefined || address !== undefined) {
      await (detailModel as any).upsert({
        where: { [fk]: userId },
        update: { ...(phone !== undefined ? { phone } : {}), ...(address !== undefined ? { address } : {}) },
        create: { [fk]: userId, phone: phone ?? null, address: address ?? null },
      })
    }

    return NextResponse.json({ success: true, message: 'User updated' })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}