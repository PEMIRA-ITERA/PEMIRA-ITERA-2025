import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMonitoringAccess } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMonitoringAccess(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const [
      totalUsers,
      totalVotes,
      totalCandidates,
      pendingValidations,
      candidateWithCounts,
      votesWithDetails
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'VOTER' } }),
      prisma.vote.count(),
      prisma.candidate.count({ where: { isActive: true } }),
      prisma.votingSession.count({
        where: {
          isValidated: false,
          isUsed: false,
          expiresAt: { gte: new Date() }
        }
      }),
      prisma.candidate.findMany({
        where: { isActive: true },
        include: { _count: { select: { votes: true } } },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.vote.findMany({
        include: {
          user: { select: { prodi: true } },
          candidate: { select: { name: true } }
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

    // Calculate prodi statistics
    const prodiStats: Record<string, { totalVotes: number; candidates: Record<string, number> }> = {}
    
    votesWithDetails.forEach((vote) => {
      const prodi = vote.user.prodi
      const candidateName = vote.candidate.name
      
      if (!prodiStats[prodi]) {
        prodiStats[prodi] = { totalVotes: 0, candidates: {} }
      }
      
      prodiStats[prodi].totalVotes++
      prodiStats[prodi].candidates[candidateName] = (prodiStats[prodi].candidates[candidateName] || 0) + 1
    })

    // Format prodi stats for frontend
    const prodiVoteStats = Object.entries(prodiStats)
      .map(([prodi, data]) => ({
        prodi,
        totalVotes: data.totalVotes,
        candidates: Object.entries(data.candidates).map(([name, count]) => ({
          name,
          count
        }))
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes)

    const stats = {
      totalUsers,
      totalVotes,
      totalCandidates,
      pendingValidations,
      votingPercentage
    }

    return NextResponse.json({ stats, voteStats, prodiVoteStats })
  } catch (error) {
    console.error('Monitoring stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
