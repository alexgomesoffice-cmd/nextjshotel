import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const rows = await prisma.auth_backgrounds.findMany({
      orderBy: { kind: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        login: rows.find((row) => row.kind === 'LOGIN') ?? null,
        registration: rows.find((row) => row.kind === 'REGISTRATION') ?? null,
      },
    })
  } catch (error) {
    console.error('Fetch auth backgrounds error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
