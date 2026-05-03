import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const admin = await prisma.system_admins.findUnique({
      where: { id: auth.payload.actor_id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: admin })
  } catch (error) {
    console.error('Failed to fetch admin profile:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { name, email, current_password, new_password } = await req.json()

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Name must be at least 2 characters' }, { status: 400 })
    }

    const updateData: any = {
      name: name.trim(),
    }

    if (email) {
       // Validate email format
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
       if (!emailRegex.test(email)) {
         return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 })
       }
       
       // Check if email is already in use by another admin
       const existing = await prisma.system_admins.findFirst({
         where: { email, id: { not: auth.payload.actor_id } }
       })
       if (existing) {
         return NextResponse.json({ success: false, message: 'Email is already taken' }, { status: 400 })
       }
       updateData.email = email.trim()
    }

    // Handle password change if provided
    if (current_password && new_password) {
      if (new_password.length < 6) {
        return NextResponse.json({ success: false, message: 'New password must be at least 6 characters' }, { status: 400 })
      }
      
      const admin = await prisma.system_admins.findUnique({
        where: { id: auth.payload.actor_id }
      })
      
      if (!admin) {
        return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 })
      }
      
      const isMatch = await bcrypt.compare(current_password, admin.password)
      if (!isMatch) {
        return NextResponse.json({ success: false, message: 'Incorrect current password' }, { status: 400 })
      }
      
      updateData.password = await bcrypt.hash(new_password, 10)
    }

    const updated = await prisma.system_admins.update({
      where: { id: auth.payload.actor_id },
      data: updateData,
      select: { id: true, name: true, email: true }
    })

    return NextResponse.json({ success: true, message: 'Profile updated successfully', data: updated })
  } catch (error) {
    console.error('Failed to update admin profile:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
