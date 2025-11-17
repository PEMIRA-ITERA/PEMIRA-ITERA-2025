import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/session'
import path from 'path'
import fs from 'fs/promises'

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024) // default 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg']

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be an image (JPG/PNG)' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const ext = file.name.split('.').pop() || 'jpg'
    const safeExt = ext.toLowerCase()
    const fileName = `candidate_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`
    const filePath = path.join(uploadsDir, fileName)

    await fs.writeFile(filePath, buffer)

    const publicUrl = `/uploads/${fileName}`

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Error uploading candidate photo:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
