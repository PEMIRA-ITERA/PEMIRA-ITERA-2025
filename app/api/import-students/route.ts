import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    // Check if user is admin
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check if file is CSV
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);
    
    // Simple CSV parsing (assumes no commas in fields)
    const lines = fileContent.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }
    
    const header = lines[0].split(',').map(h => h.trim());
    const records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      header.forEach((h, i) => { record[h] = values[i] || ''; });
      return record;
    });

    // Validate CSV structure
    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    const firstRecord = records[0];
    if (!firstRecord['Nama Mahasiswa'] || !firstRecord['NIM'] || !firstRecord['Program Studi']) {
      return NextResponse.json({ 
        error: 'CSV must contain columns: Nama Mahasiswa, NIM, Program Studi' 
      }, { status: 400 });
    }

    // Process records
    const results = {
      total: records.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      try {
        const name = String(record['Nama Mahasiswa'] ?? '').trim();
        const nim = String(record['NIM'] ?? '').trim();
        const prodi = String(record['Program Studi'] ?? '').trim();

        // Skip if any required field is missing
        if (!name || !nim || !prodi) {
          results.skipped++;
          continue;
        }

        // Normalize NIM (remove non-digits)
        const nimDigits = nim.replace(/\D/g, '');
        
        if (!nimDigits) {
          results.skipped++;
          continue;
        }

        // Check if user with this NIM already exists
        const existingUser = await prisma.user.findUnique({
          where: { nim: nimDigits },
        });

        if (existingUser) {
          results.skipped++;
          continue;
        }

        // Create user (no email/password needed)
        await prisma.user.create({
          data: {
            name,
            nim: nimDigits,
            prodi,
            role: 'VOTER',
          },
        });

        results.imported++;
      } catch (error: any) {
        results.skipped++;
        results.errors.push(`Error processing record: ${error?.message || 'Unknown error'}`);
      }
    }

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        action: 'IMPORT_STUDENTS',
        details: { results },
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || '',
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 });
  }
}