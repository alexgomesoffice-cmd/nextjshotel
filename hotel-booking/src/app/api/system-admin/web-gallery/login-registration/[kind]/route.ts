import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'auth-backgrounds')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

function normalizeKind(kind: string): 'LOGIN' | 'REGISTRATION' | null {
  const value = kind.trim().toLowerCase()
  if (value === 'login') return 'LOGIN'
  if (value === 'registration') return 'REGISTRATION'
  return null
}

async function deleteStoredImage(imageUrl: string | null) {
  if (!imageUrl) return

  const fileName = path.basename(imageUrl)
  const targetPath = path.join(UPLOAD_DIR, fileName)

  if (targetPath.startsWith(UPLOAD_DIR)) {
    try {
      await fs.unlink(targetPath)
    } catch {
      // Ignore missing or already-deleted files.
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  let filepathToCleanup: string | null = null

  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const resolvedParams = await params
    const normalizedKind = normalizeKind(resolvedParams.kind)

    if (!normalizedKind) {
      return NextResponse.json({ success: false, message: 'Invalid background type' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ success: false, message: 'Image file is required' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: 'Image must be 5 MB or smaller.' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Only PNG, JPEG, and WEBP images are supported.' }, { status: 400 })
    }

    const existing = await prisma.auth_backgrounds.upsert({
      where: { kind: normalizedKind },
      update: {},
      create: { kind: normalizedKind, image_url: null },
    })

    await ensureDir()

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${normalizedKind.toLowerCase()}-${uuidv4()}.webp`
    const filepath = path.join(UPLOAD_DIR, filename)

    await sharp(buffer)
      .rotate()
      .webp({ quality: 80 })
      .toFile(filepath)

    filepathToCleanup = filepath

    const finalImageUrl = `/uploads/auth-backgrounds/${filename}`

    await deleteStoredImage(existing.image_url)

    const updated = await prisma.auth_backgrounds.update({
      where: { id: existing.id },
      data: { image_url: finalImageUrl },
    })

    filepathToCleanup = null

    return NextResponse.json({ success: true, message: 'Background updated successfully', data: updated })
  } catch (error) {
    console.error('Update auth background error:', error)

    if (filepathToCleanup) {
      try {
        await fs.unlink(filepathToCleanup)
      } catch {
        // Ignore cleanup failures.
      }
    }

    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const resolvedParams = await params
    const normalizedKind = normalizeKind(resolvedParams.kind)

    if (!normalizedKind) {
      return NextResponse.json({ success: false, message: 'Invalid background type' }, { status: 400 })
    }

    const existing = await prisma.auth_backgrounds.findUnique({ where: { kind: normalizedKind } })

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Background not found' }, { status: 404 })
    }

    if (existing.image_url) {
      await deleteStoredImage(existing.image_url)
    }

    const updated = await prisma.auth_backgrounds.update({
      where: { id: existing.id },
      data: { image_url: null },
    })

    return NextResponse.json({ success: true, message: 'Background deleted successfully', data: updated })
  } catch (error) {
    console.error('Delete auth background error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
