import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import {
  deletePublicImage,
  ImageUploadError,
  removePublicImageFile,
  storePublicImage,
} from '@/lib/public-image-storage'

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
      const storedImage = await storePublicImage(file, 'hero-banners')
      filepathToCleanup = storedImage.filePath
      finalImageUrl = storedImage.imageUrl
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
        await deletePublicImage(existingBanner.image_url, 'hero-banners')
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
        await removePublicImageFile(filepathToCleanup, 'hero-banners')
      } catch (e) {
        console.error('Failed to cleanup newly created image after DB failure:', e)
      }
    }

    if (error instanceof ImageUploadError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
