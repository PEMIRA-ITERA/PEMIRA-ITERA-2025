"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Vote, ArrowLeft, Loader2, ChevronDown } from "@/lib/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

// Daftar program studi ITERA
const programStudi = [
  "S1 TEKNIK GEOFISIKA",
  "S1 TEKNIK GEOLOGI",
  "S1 TEKNIK PERTAMBANGAN",
  "S1 TEKNIK KIMIA",
  "S1 TEKNIK FISIKA",
  "S1 TEKNIK ELEKTRO",
  "S1 TEKNIK MESIN",
  "S1 TEKNIK MATERIAL",
  "S1 TEKNIK INDUSTRI",
  "S1 TEKNIK SISTEM ENERGI",
  "S1 TEKNIK LINGKUNGAN",
  "S1 TEKNIK KELAUTAN",
  "S1 TEKNIK SIPIL",
  "S1 ARSITEKTUR",
  "S1 PERENCANAAN WILAYAH DAN KOTA",
  "S1 MATEMATIKA",
  "S1 FISIKA",
  "S1 KIMIA",
  "S1 BIOLOGI",
  "S1 FARMASI",
  "S1 SAINS DATA",
  "S1 TEKNOLOGI INFORMASI",
  "S1 TEKNIK INFORMATIKA",
  "S1 TEKNIK BIOSISTEM",
  "S1 TEKNOLOGI PANGAN",
  "S1 TEKNOLOGI INDUSTRI PERTANIAN",
  "S1 REKAYASA KEHUTANAN",
  "S1 REKAYASA KOSMETIK"
]

function LoginForm() {
  const [nim, setNim] = useState("")
  const [name, setName] = useState("")
  const [prodi, setProdi] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect")

  // Cek apakah user sudah login → redirect langsung
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include"
        })
        if (res.ok) {
          const { user } = await res.json()
          if (redirect) {
            router.replace(redirect)
            return
          }
          if (user.role === "SUPER_ADMIN") {
            router.replace("/super-admin")
          } else if (user.role === "ADMIN") {
            router.replace("/admin")
          } else if (user.role === "MONITORING") {
            router.replace("/monitoring")
          } else {
            router.replace(user.hasVoted ? "/success" : "/generate-code")
          }
        }
      } catch (err) {
        console.error("Session check error:", err)
      }
    }
    checkSession()
  }, [redirect, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!nim || !name || !prodi) {
      setError("Mohon isi semua field yang diperlukan")
      setLoading(false)
      return
    }

    try {
      const payload = {
        nim: nim.trim(),
        name: name.trim(),
        prodi: prodi.trim(),
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Data mahasiswa tidak valid atau tidak ditemukan")
        return
      }

      console.log("Login successful:", result.user)

      // Tunggu cookie terset
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Redirect prioritas: query ?redirect
      if (redirect) {
        router.replace(redirect)
        return
      }

      // Redirect default berdasarkan role
      const user = result.user
      if (user.role === "SUPER_ADMIN") {
        router.replace("/super-admin")
      } else if (user.role === "ADMIN") {
        router.replace("/admin")
      } else if (user.role === "MONITORING") {
        router.replace("/monitoring")
      } else {
        router.replace(user.hasVoted ? "/success" : "/generate-code")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Terjadi kesalahan saat login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Vote className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-xl text-foreground">ITERA Election</h1>
              <p className="text-sm text-muted-foreground">Pemilihan Presiden Mahasiswa</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Masukkan NIM, Nama Lengkap, dan Program Studi Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="nim">NIM</Label>
                <Input
                  id="nim"
                  type="text"
                  placeholder="Masukkan NIM Anda"
                  value={nim}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "")
                    setNim(onlyDigits)
                  }}
                  required
                  disabled={loading}
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Masukkan Nama Lengkap Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  required
                  disabled={loading}
                  className="uppercase"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prodi">Program Studi</Label>
                <Select
                  value={prodi}
                  onValueChange={setProdi}
                  disabled={loading}
                  required
                >
                  <SelectTrigger id="prodi" className="w-full">
                    <SelectValue placeholder="Pilih Program Studi" />
                  </SelectTrigger>
                  <SelectContent>
                    {programStudi.map((ps) => (
                      <SelectItem key={ps} value={ps}>
                        {ps}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <Vote className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Lupa Password?
              </Link>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Button variant="link" className="p-0 h-auto font-normal">
                  Hubungi admin untuk registrasi
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <Vote className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h1 className="font-bold text-xl text-foreground">ITERA Election</h1>
                <p className="text-sm text-muted-foreground">Pemilihan Presiden Mahasiswa</p>
              </div>
            </div>
          </div>
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
