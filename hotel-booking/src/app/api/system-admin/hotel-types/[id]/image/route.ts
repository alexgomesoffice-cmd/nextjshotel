import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import {
  deletePublicImage,
  ImageUploadError,
  removePublicImageFile,
  storePublicImage,
} from '@/lib/public-image-storage'

type Params = { params: Promise<{ id: string }> }
const UPLOAD_SUBDIRECTORY = 'hotel-types'

async function getHotelTypeId(params: Params['params']) {
  const { id } = await params
  const typeId = Number(id)
  return Number.isInteger(typeId) && typeId > 0 ? typeId : null
}

export async function POST(req: NextRequest, { params }: Params) {
  let newImagePath: string | null = null

  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const typeId = await getHotelTypeId(params)
    if (!typeId) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const hotelType = await prisma.hotel_types.findUnique({ where: { id: typeId } })
    if (!hotelType) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('image')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, message: 'An image file is required.' }, { status: 400 })
    }

    const storedImage = await storePublicImage(file, UPLOAD_SUBDIRECTORY)
    newImagePath = storedImage.filePath

    const updatedHotelType = await prisma.hotel_types.update({
      where: { id: typeId },
      data: { image_url: storedImage.imageUrl },
    })
    newImagePath = null

    if (hotelType.image_url) {
      try {
        await deletePublicImage(hotelType.image_url, UPLOAD_SUBDIRECTORY)
      } catch (error) {
        console.error('Failed to cleanup previous hotel type image:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Hotel type image updated successfully',
      data: updatedHotelType,
    })
  } catch (error) {
    if (newImagePath) {
      try {
        await removePublicImageFile(newImagePath, UPLOAD_SUBDIRECTORY)
      } catch (cleanupError) {
        console.error('Failed to cleanup newly uploaded hotel type image:', cleanupError)
      }
    }

    if (error instanceof ImageUploadError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 })
    }

    console.error('Failed to update hotel type image:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const typeId = await getHotelTypeId(params)
    if (!typeId) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const hotelType = await prisma.hotel_types.findUnique({ where: { id: typeId } })
    if (!hotelType) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    const updatedHotelType = await prisma.hotel_types.update({
      where: { id: typeId },
      data: { image_url: null },
    })

    if (hotelType.image_url) {
      try {
        await deletePublicImage(hotelType.image_url, UPLOAD_SUBDIRECTORY)
      } catch (error) {
        console.error('Failed to cleanup deleted hotel type image:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Hotel type image deleted successfully',
      data: updatedHotelType,
    })
  } catch (error) {
    console.error('Failed to delete hotel type image:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
