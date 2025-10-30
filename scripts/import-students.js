/*
  One-off CSV import script for PEMIRA ITERA 2025
  Usage (PowerShell):
    node scripts/import-students.js "public/Mahasiswa aktif 2019-2025.csv"

  Notes:
  - Expects CSV header: Nama Mahasiswa,NIM,Program Studi
  - This simple parser assumes no commas inside fields.
*/

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({ log: ['query'] })

function normalizeNim(nimRaw) {
  const trimmed = String(nimRaw || '').trim()
  return trimmed.replace(/\D/g, '')
}

function normalizeText(s) {
  return String(s || '').trim()
}

async function main() {
  const argPath = process.argv[2] || 'public/Mahasiswa aktif 2019-2025.csv'
  const csvPath = path.resolve(process.cwd(), argPath)

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  console.log('Starting import from:', csvPath)

  const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' })
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })

  let lineNo = 0
  let counts = { total: 0, imported: 0, skipped: 0, errors: 0 }
  let headerChecked = false

  for await (const line of rl) {
    lineNo++
    const raw = line.replace(/\uFEFF/g, '') // remove BOM if present
    if (!raw.trim()) continue // skip empty lines

    // Header validation
    if (!headerChecked) {
      headerChecked = true
      const header = raw.trim()
      const expected = 'Nama Mahasiswa,NIM,Program Studi'
      if (header !== expected) {
        console.warn(`Warning: header does not match expected string.\nGot:     ${header}\nExpect:  ${expected}`)
      }
      continue
    }

    counts.total++

    try {
      // naive CSV split (assumes no commas in fields)
      const parts = raw.split(',')
      if (parts.length < 3) {
        counts.skipped++
        console.warn(`Line ${lineNo}: not enough columns ->`, raw)
        continue
      }

      const name = normalizeText(parts[0])
      const nim = normalizeNim(parts[1])
      const prodi = normalizeText(parts.slice(2).join(',')) // in case prodi contained commas in future

      if (!name || !nim || !prodi) {
        counts.skipped++
        console.warn(`Line ${lineNo}: missing required fields -> name:'${name}', nim:'${nim}', prodi:'${prodi}'`)
        continue
      }

      const existing = await prisma.user.findUnique({ where: { nim } })
      if (existing) {
        counts.skipped++
        continue
      }

      await prisma.user.create({
        data: {
          name,
          nim,
          prodi,
          role: 'VOTER',
        },
      })

      counts.imported++
      if (counts.imported % 100 === 0) {
        console.log(`Imported ${counts.imported} users...`)
      }
    } catch (e) {
      counts.errors++
      console.error(`Line ${lineNo}: error ->`, e && e.message ? e.message : e)
    }
  }

  console.log('Import finished:')
  console.log(JSON.stringify(counts, null, 2))
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
