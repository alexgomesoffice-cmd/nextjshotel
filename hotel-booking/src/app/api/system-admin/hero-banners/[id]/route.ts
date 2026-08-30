import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'hero-banners')

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let filepathToCleanup: string | null = null

  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const resolvedParams = await params
    const bannerId = parseInt(resolvedParams.id)

    if (isNaN(bannerId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const existingBanner = await prisma.hero_banners.findUnique({ where: { id: bannerId } })
    if (!existingBanner) {
      return NextResponse.json({ success: false, message: 'Banner not found' }, { status: 404 })
    }

    const formData = await req.formData()
    
    // Parse fields
    const eyebrow = formData.get('eyebrow') as string | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    
    // Check for duplicates
    // Reject duplicate: eyebrow + title + description across all populated banner slots, excluding the current banner itself.
    // Empty/unconfigured slots are ignored.
    const isPopulated = !!(eyebrow || title || description)
    if (isPopulated) {
      const duplicate = await prisma.hero_banners.findFirst({
        where: {
          id: { not: bannerId },
          eyebrow: eyebrow || null,
          title: title || null,
          description: description || null
        }
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'A hero banner with this exact content already exists.' },
          { status: 409 }
        )
      }
    }

    const file = formData.get('image') as File | null
    const removeImage = formData.get('remove_image') === 'true'
    let finalImageUrl = existingBanner.image_url

    if (file) {
      const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ success: false, message: 'Image must be 1 MB or smaller.' }, { status: 400 })
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ success: false, message: 'Only PNG, JPEG, and WEBP images are supported.' }, { status: 400 })
      }

      await ensureDir()
      
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `${uuidv4()}.webp`
      const filepath = path.join(UPLOAD_DIR, filename)
      
      // Save new file
      await sharp(buffer)
        .webp({ quality: 80 })
        .toFile(filepath)
        
      filepathToCleanup = filepath // mark for potential cleanup if DB fails
      finalImageUrl = `/uploads/hero-banners/${filename}`
    } else if (removeImage) {
      finalImageUrl = null
    }

    const updatedBanner = await prisma.hero_banners.update({
      where: { id: bannerId },
      data: {
        eyebrow: eyebrow || null,
        title: title || null,
        description: description || null,
        image_url: finalImageUrl
      }
    })

    // If we reach here, DB update was successful.
    filepathToCleanup = null // no need to cleanup the NEW file

    // Safe Old Image Cleanup
    if ((file || removeImage) && existingBanner.image_url) {
      try {
        const oldFilename = path.basename(existingBanner.image_url)
        const oldFilepath = path.join(UPLOAD_DIR, oldFilename)
        
        // Ensure the path is strictly inside the hero-banners dir to prevent traversal
        if (oldFilepath.startsWith(UPLOAD_DIR)) {
          await fs.unlink(oldFilepath)
        }
      } catch (err) {
        console.error('Failed to cleanup old hero banner image:', err)
        // Non-fatal, just log it.
      }
    }

    return NextResponse.json({ success: true, message: 'Banner updated successfully', data: updatedBanner })
  } catch (error) {
    console.error('Update hero banner error:', error)
    
    // Cleanup new file if DB update failed
    if (filepathToCleanup) {
      try {
        await fs.unlink(filepathToCleanup)
      } catch (e) {
        console.error('Failed to cleanup newly created image after DB failure:', e)
      }
    }
    
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
