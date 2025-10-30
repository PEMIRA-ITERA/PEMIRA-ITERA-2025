// /api/admin/stats/route.ts
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

    // Get today's date range (start and end of today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Run all queries in parallel for performance and compute fields expected by client
    const [
      totalUsers,
      totalVotes,
      totalCandidates,
      pendingValidations,
      totalValidated,
      todayValidations,
      totalVoted,
      candidateWithCounts
    ] = await Promise.all([
      // Total registered voters
      prisma.user.count({ where: { role: 'VOTER' } }),
      // Total votes cast
      prisma.vote.count(),
      // Active candidates count
      prisma.candidate.count({ where: { isActive: true } }),
      // Pending (not validated, not used, not expired) sessions
      prisma.votingSession.count({
        where: {
          isValidated: false,
          isUsed: false,
          expiresAt: { gte: new Date() }
        }
      }),
      // Total validated sessions
      prisma.votingSession.count({
        where: {
          isValidated: true
        }
      }),
      // Today's validations
      prisma.votingSession.count({
        where: {
          isValidated: true,
          validatedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      // Total users who have voted
      prisma.user.count({
        where: {
          hasVoted: true
        }
      }),
      // Candidate vote counts
      prisma.candidate.findMany({
        where: { isActive: true },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: 'asc' }
      })
    ])

    const votingPercentage = totalUsers > 0 ? Math.round((totalVotes / totalUsers) * 100) : 0

    const voteStats = candidateWithCounts.map((c) => ({
      candidateId: c.id,
      candidateName: c.name,
      voteCount: c._count.votes,
      percentage: totalVotes > 0 ? parseFloat(((c._count.votes / totalVotes) * 100).toFixed(2)) : 0
    }))

    const stats = {
      totalUsers,
      totalVotes,
      totalCandidates,
      pendingValidations,
      totalValidated,
      todayValidations,
      totalVoted,
      votingPercentage
    }

    return NextResponse.json({ stats, voteStats })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}