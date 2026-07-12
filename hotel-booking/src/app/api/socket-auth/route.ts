import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token_user')?.value
    ?? cookieStore.get('token_hotel_admin')?.value
    ?? cookieStore.get('token_system_admin')?.value
    ?? cookieStore.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await verifyToken(token)
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
