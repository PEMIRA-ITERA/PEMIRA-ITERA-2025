"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, UserCheck, UserX, ChevronLeft, ChevronRight } from "lucide-react"
import { ApiClient } from "@/lib/api-client"
import type { User, Role } from "@/lib/types"

// Extend the User type to include additional properties used in this component
interface ExtendedUser extends User {
  isActive?: boolean;
}

interface UserResponse {
  users: ExtendedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalUsers: number;
    totalVoters: number;
    totalVoted: number;
    totalAdmins: number;
  };
}

export default function MonitoringUserManagement() {
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [prodiFilter, setProdiFilter] = useState("all")
  const [prodiList, setProdiList] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalVoters: 0,
    totalVoted: 0,
    totalAdmins: 0
  })
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [error, setError] = useState("")
  const numberFormatter = new Intl.NumberFormat('id-ID')

  useEffect(() => {
    loadUsers()
  }, [page, roleFilter, statusFilter, prodiFilter])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        loadUsers()
      } else {
        setPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await ApiClient.getUsers({
        page,
        limit,
        search: searchTerm,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        prodi: prodiFilter !== 'all' ? prodiFilter : undefined
      })
      
      setUsers(response.users)
      setPagination(response.pagination)
      setTotalStats(response.stats)
      
      if (Array.isArray(response.prodiList) && response.prodiList.length > 0) {
        setProdiList(response.prodiList)
      } else {
        const prodies = [...new Set(response.users.map((user: ExtendedUser) => user.prodi).filter(Boolean))] as string[]
        setProdiList(prodies)
      }
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingUser(userId)
      setError("")

      if (newRole !== 'VOTER' && newRole !== 'ADMIN') {
        setError('Role hanya bisa diubah antara Admin dan Voter')
        return
      }

      await ApiClient.updateUser(userId, { role: newRole as Role })
      await loadUsers()
    } catch (err) {
      console.error('Error updating user role:', err)
      setError('Gagal memperbarui role pengguna')
    } finally {
      setUpdatingUser(null)
    }
  }

  const getRoleBadge = (role: Role) => {
    const normalized = role.toUpperCase()
    const baseClass = "px-3 py-1 text-xs font-semibold rounded-full"
    if (normalized === 'SUPER_ADMIN') {
      return <span className={`${baseClass} bg-rose-100 text-rose-700`}>SUPER_ADMIN</span>
    }
    if (normalized === 'ADMIN') {
      return <span className={`${baseClass} bg-blue-100 text-blue-700`}>ADMIN</span>
    }
    if (normalized === 'MONITORING') {
      return <span className={`${baseClass} bg-amber-100 text-amber-700`}>MONITORING</span>
    }
    return <span className={`${baseClass} bg-slate-100 text-slate-700`}>VOTER</span>
  }

  const getVoteStatusBadge = (hasVoted: boolean) => {
    const baseClass = "inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full"
    return hasVoted ? (
      <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>
        <UserCheck className="h-3.5 w-3.5" /> Sudah Vote
      </span>
    ) : (
      <span className={`${baseClass} bg-slate-900 text-white`}>
        <UserX className="h-3.5 w-3.5" /> Belum Vote
      </span>
    )
  }

  const totalFiltered = pagination.total
  const totalNotVoted = Math.max(totalStats.totalUsers - totalStats.totalVoted, 0)

  return (
    <Card className="w-full">
      <CardHeader className="gap-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold">Manajemen Pengguna</CardTitle>
            <CardDescription>Kelola data pengguna dan hak akses sistem</CardDescription>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 text-sm text-muted-foreground">
            <p>
              Menampilkan <span className="font-semibold text-foreground">{users.length}</span> dari{' '}
              <span className="font-semibold text-foreground">{numberFormatter.format(totalFiltered)}</span> pengguna
            </p>
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan nama, NIM, atau prodi..."
              className="pl-12 h-12 rounded-2xl border-muted"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={prodiFilter} onValueChange={setProdiFilter}>
              <SelectTrigger className="h-11 rounded-xl justify-between">
                <SelectValue placeholder="Semua Prodi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Prodi</SelectItem>
                {prodiList.map((prodi) => (
                  <SelectItem key={prodi} value={prodi}>
                    {prodi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 rounded-xl justify-between">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="VOTER">Pemilih</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="MONITORING">Monitoring</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 rounded-xl justify-between">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="voted">Sudah Vote</SelectItem>
                <SelectItem value="not-voted">Belum Vote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Hasil Filter</p>
            <p className="text-3xl font-bold">{numberFormatter.format(totalFiltered)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Pengguna</p>
            <p className="text-3xl font-bold">{numberFormatter.format(totalStats.totalUsers)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Sudah Vote</p>
            <p className="text-3xl font-bold">{numberFormatter.format(totalStats.totalVoted)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Belum Vote</p>
            <p className="text-3xl font-bold">{numberFormatter.format(totalNotVoted)}</p>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Program Studi</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status Vote</TableHead>
                <TableHead>Ubah Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada data pengguna
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-semibold uppercase text-sm tracking-wide">{user.name}</TableCell>
                    <TableCell>{user.nim}</TableCell>
                    <TableCell>{user.prodi || '-'}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getVoteStatusBadge(Boolean(user.hasVoted))}</TableCell>
                    <TableCell>
                      {(user.role === 'ADMIN' || user.role === 'VOTER') ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updatingUser === user.id}
                        >
                          <SelectTrigger className="w-32 rounded-xl">
                            <SelectValue placeholder="Pilih Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VOTER">Voter</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Tidak dapat diubah</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Menampilkan {users.length} dari {pagination.total} pengguna
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <span className="text-sm">
                Halaman {page} dari {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages || loading}
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
