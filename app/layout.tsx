import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  metadataBase: new URL('https://pemira-itera-2025.example.com'),
  title: {
    default: 'PEMIRA KM ITERA 2025',
    template: '%s | PEMIRA KM ITERA 2025'
  },
  description:
    'Portal resmi PEMIRA KM ITERA 2025 untuk informasi tahapan pemilihan, kandidat, dan hasil perhitungan suara secara transparan.',
  generator: 'PEMIRA KM ITERA 2025',
  keywords: [
    'PEMIRA',
    'PEMIRA ITERA',
    'PEMIRA KM ITERA 2025',
    'Pemira Kampus',
    'Pemilu Mahasiswa',
    'KM ITERA'
  ],
  authors: [{ name: 'Komisi Pemilihan Umum KM ITERA' }],
  openGraph: {
    title: 'PEMIRA KM ITERA 2025',
    description:
      'Ikuti seluruh informasi resmi PEMIRA KM ITERA 2025, mulai dari jadwal, kandidat, hingga hasil akhir.',
    url: 'https://pemira-itera-2025.example.com',
    siteName: 'PEMIRA KM ITERA 2025',
    locale: 'id_ID',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PEMIRA KM ITERA 2025',
    description:
      'Sumber informasi resmi PEMIRA KM ITERA 2025 dengan pembaruan real-time.',
    creator: '@pemira_itera'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true
    }
  },
  verification: {
    google: 'ntB2HhODOp1coWZxXyoJ60GaQA49Kg4KS8-zM7W3uXw'
  },
  icons: {
    icon: '/favicon.ico'
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
