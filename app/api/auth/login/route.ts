import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password, nim, name, prodi } = await request.json()
    
    // Login dengan NIM + Nama + Prodi (untuk mahasiswa)
    if (nim && name && prodi) {
      console.log('Login attempt with NIM:', nim)
      
      const nimTrim = String(nim).trim()
      const nimDigits = nimTrim.replace(/\D/g, '')
      const nameTrim = String(name).trim()
      const prodiTrim = String(prodi).trim()

      // Find user by NIM
      const user = await prisma.user.findUnique({
        where: { nim: nimDigits },
        select: {
          id: true,
          name: true,
          nim: true,
          prodi: true,
          role: true,
          hasVoted: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'NIM tidak ditemukan' },
          { status: 401 }
        )
      }

      // Validasi nama dan prodi (case insensitive)
      if (user.name.toLowerCase() !== nameTrim.toLowerCase() || 
          user.prodi.toLowerCase() !== prodiTrim.toLowerCase()) {
        return NextResponse.json(
          { error: 'Data mahasiswa tidak valid' },
          { status: 401 }
        )
      }

      console.log('Login successful for student:', user.nim)
      
      // Log login event
      try {
        await prisma.adminLog.create({
          data: {
            adminId: user.id,
            action: 'STUDENT_LOGIN_SUCCESS',
            target: user.nim,
            details: { role: user.role },
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || ''
          }
        })
      } catch (e) {
        console.warn('Failed to log login event:', e)
      }

      // Create response with user data
      const userWithoutPassword = user
      
      const response = NextResponse.json({
        user: userWithoutPassword,
        message: 'Login berhasil'
      })

      // Create JWT session token
      const jwtSecret = process.env.JWT_SECRET || 'itera-election-secret-key-2025'
      const sessionToken = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      // Set secure session cookie
      response.cookies.set('user-session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })

      return response;
    }
    

    return NextResponse.json(
      { error: 'Data login tidak valid' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}