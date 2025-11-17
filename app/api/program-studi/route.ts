import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'Mahasiswa aktif 2019-2025.csv')
    const fileContent = await fs.promises.readFile(csvPath, 'utf-8')

    const lines = fileContent.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      return NextResponse.json({ programStudi: [] })
    }

    const header = lines[0].split(',').map((h) => h.trim())
    const prodiIndex = header.indexOf('Program Studi')

    if (prodiIndex === -1) {
      return NextResponse.json({ programStudi: [] })
    }

    const prodiSet = new Set<string>()

    for (const line of lines.slice(1)) {
      const values = line.split(',').map((v) => v.trim())
      const prodi = values[prodiIndex]
      if (prodi) {
        prodiSet.add(prodi)
      }
    }

    const programStudi = Array.from(prodiSet).sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ programStudi })
  } catch (error) {
    console.error('Error reading program studi from CSV:', error)
    return NextResponse.json({ programStudi: [] }, { status: 500 })
  }
}
