import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type')?.trim().toLowerCase()

    if (!type || !['login', 'registration'].includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid background type' }, { status: 400 })
    }

    const kind = type === 'login' ? 'LOGIN' : 'REGISTRATION'
    const background = await prisma.auth_backgrounds.findUnique({
      where: { kind },
    })

    return NextResponse.json({
      success: true,
      data: background ? { kind: background.kind, image_url: background.image_url } : null,
    })
  } catch (error) {
    console.error('Fetch public auth background error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
