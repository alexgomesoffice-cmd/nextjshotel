import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { stageFieldChange, getLatestCase } from '@/lib/case-engine'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'hotel-documents')
const ALLOWED_EXT = /\.(pdf|jpg)$/i
const DOCUMENT_TYPES = new Set([
  'TRADE_LICENSE', 'TAX_CERTIFICATE', 'TIN_CERTIFICATE', 'VAT_CERTIFICATE',
  'BUSINESS_DOCUMENT', 'OWNER_DOCUMENT', 'ADMIN_DOCUMENT',
])

async function ensureDir() {
  try {
    await fs.access(UPLOAD_DIR)
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * POST /api/hotel-admin/documents
 * multipart form: file, document_type, existing_id (optional — replaces
 * that document instead of adding a new one of the same type).
 * The file lands on disk immediately (just storage); the row that actually
 * attaches it to the hotel is staged into the draft case.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('document_type') as string | null
    const existingIdRaw = formData.get('existing_id') as string | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }
    if (!documentType || !DOCUMENT_TYPES.has(documentType)) {
      return NextResponse.json({ success: false, message: 'Invalid document_type' }, { status: 400 })
    }
    const originalName = (file as any).name || ''
    if (!ALLOWED_EXT.test(originalName)) {
      return NextResponse.json({ success: false, message: 'Only .pdf or .jpg files are allowed' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    await ensureDir()
    const ext = originalName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg'
    const filename = `${uuidv4()}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filepath, buffer)
    const fileUrl = `/uploads/hotel-documents/${filename}`

    const existingId = existingIdRaw ? parseInt(existingIdRaw) : null
    if (existingId) {
      const existingDoc = await prisma.hotel_documents.findUnique({ where: { id: existingId } })
      if (!existingDoc || existingDoc.hotel_id !== hotelId) {
        return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 })
      }
      await stageFieldChange({
        hotelId, hotelAdminId,
        entityType: 'HOTEL_DOCUMENT', entityId: existingId, fieldName: 'file_url',
        previousValue: existingDoc.file_url, proposedValue: fileUrl,
      })
    } else {
      await stageFieldChange({
        hotelId, hotelAdminId,
        entityType: 'HOTEL_DOCUMENT', entityId: null, fieldName: null,
        previousValue: null, proposedValue: { document_type: documentType, file_url: fileUrl },
      })
    }

    const currentCase = await getLatestCase(hotelId)
    return NextResponse.json({ success: true, message: 'Document proposed — pending review', data: { currentCase } })
  } catch (error: any) {
    console.error('Document upload error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 })
  }
}