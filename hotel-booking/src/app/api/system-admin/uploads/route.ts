import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const { filename, data, uploadSubDir } = body as { filename?: string; data?: string; uploadSubDir?: string }
    if (!data) return NextResponse.json({ success: false, message: 'No data provided' }, { status: 400 })

    // data should be a data URL: data:image/png;base64,....
    const matches = data.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) return NextResponse.json({ success: false, message: 'Invalid data format' }, { status: 400 })

    const mime = matches[1]
    const b64 = matches[2]
    const ext = mime.split('/')[1]
    const name = (filename && filename.replace(/[^a-z0-9._-]/gi, '_')) || `${uuidv4()}.${ext}`

    const sub = uploadSubDir || 'misc'
    const dir = path.join(UPLOAD_DIR, sub)
    ensureDir(dir)

    const outPath = path.join(dir, name)
    const buffer = Buffer.from(b64, 'base64')
    fs.writeFileSync(outPath, buffer)

    // Return a public URL path relative to /uploads
    const urlPath = `/uploads/${sub}/${name}`

    return NextResponse.json({ success: true, url: urlPath })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}
