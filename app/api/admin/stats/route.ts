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
      candidateWithCounts,
      votesWithUserAndCandidate
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
      }),
      // Votes joined with user and candidate for per-prodi aggregation
      prisma.vote.findMany({
        include: {
          user: {
            select: { prodi: true }
          },
          candidate: {
            select: { id: true, name: true }
          }
        }
      })
    ])

    const votingPercentage = totalUsers > 0 ? Math.round((totalVotes / totalUsers) * 100) : 0

    const voteStats = candidateWithCounts.map((c) => ({
      candidateId: c.id,
      candidateName: c.name,
      voteCount: c._count.votes,
      percentage: totalVotes > 0 ? parseFloat(((c._count.votes / totalVotes) * 100).toFixed(2)) : 0
    }))

    // Aggregate votes by program studi (prodi) and candidate
    const prodiCandidateMap: Record<string, Record<string, { candidateId: string; candidateName: string; voteCount: number }>> = {}
    const prodiTotals: Record<string, number> = {}

    for (const vote of votesWithUserAndCandidate) {
      const prodi = vote.user?.prodi || 'Tidak Diketahui'
      const candidateId = vote.candidate.id
      const candidateName = vote.candidate.name

      if (!prodiCandidateMap[prodi]) {
        prodiCandidateMap[prodi] = {}
        prodiTotals[prodi] = 0
      }

      if (!prodiCandidateMap[prodi][candidateId]) {
        prodiCandidateMap[prodi][candidateId] = {
          candidateId,
          candidateName,
          voteCount: 0
        }
      }

      prodiCandidateMap[prodi][candidateId].voteCount += 1
      prodiTotals[prodi] += 1
    }

    const prodiVoteStats = Object.entries(prodiCandidateMap).map(([prodi, candidates]) => {
      const totalInProdi = prodiTotals[prodi] || 0
      const candidateStats = Object.values(candidates).map((c) => ({
        candidateId: c.candidateId,
        candidateName: c.candidateName,
        voteCount: c.voteCount,
        percentage: totalInProdi > 0 ? parseFloat(((c.voteCount / totalInProdi) * 100).toFixed(2)) : 0
      }))

      return {
        prodi,
        totalVotes: totalInProdi,
        candidates: candidateStats
      }
    })

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

    return NextResponse.json({ stats, voteStats, prodiVoteStats })

  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}