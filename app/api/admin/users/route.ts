import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const prodi = searchParams.get('prodi') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    // Build where clause
    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nim: { contains: search, mode: 'insensitive' } },
        { prodi: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Prodi filter
    if (prodi) {
      where.prodi = { contains: prodi, mode: 'insensitive' }
    }

    // Role filter
    if (role && role !== 'all') {
      where.role = role
    }

    // Status filter
    if (status && status !== 'all') {
      where.hasVoted = status === 'voted'
    }

    // Get total count for pagination
    const totalUsers = await prisma.user.count({ where })

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Get unique prodi list for filter dropdown
    const prodiList = await prisma.user.findMany({
      select: { prodi: true },
      distinct: ['prodi'],
      orderBy: { prodi: 'asc' }
    })

    return NextResponse.json({ 
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      },
      prodiList: prodiList.map(p => p.prodi)
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}