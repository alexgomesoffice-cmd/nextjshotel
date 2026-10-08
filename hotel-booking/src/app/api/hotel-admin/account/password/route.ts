import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match.',
  })

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const result = changePasswordSchema.safeParse(body)

    if (!result.success) {
      const issue = result.error.issues[0]
      return NextResponse.json(
        { success: false, message: issue?.message || 'Unable to update password. Please try again.' },
        { status: 400 },
      )
    }

    const { current_password, new_password } = result.data

    const admin = await prisma.hotel_admins.findUnique({
      where: { id: auth.payload.actor_id },
      select: { password: true },
    })

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin not found.' }, { status: 404 })
    }

    const isCurrentPasswordValid = await bcrypt.compare(current_password, admin.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ success: false, message: 'Incorrect current password.' }, { status: 400 })
    }

    if (current_password === new_password) {
      return NextResponse.json(
        { success: false, message: 'New password must be different from the current password.' },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(new_password, 10)

    await prisma.hotel_admins.update({
      where: { id: auth.payload.actor_id },
      data: {
        password: hashedPassword,
      },
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (error) {
    console.error('Hotel admin password update error:', error)
    return NextResponse.json(
      { success: false, message: 'Unable to update password. Please try again.' },
      { status: 500 },
    )
  }
}
