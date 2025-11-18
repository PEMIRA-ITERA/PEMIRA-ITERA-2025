"use client"

import { useState, useRef, useEffect } from "react"
import type { ChangeEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CameraOff, AlertCircle, CheckCircle, Upload } from "lucide-react"
import dynamic from 'next/dynamic'

// Dynamically import the scanner to avoid SSR issues
const BarcodeScannerComponent = dynamic(
  () => import('react-qr-barcode-scanner'),
  { ssr: false, loading: () => <p>Loading scanner...</p> }
)

interface QRScannerProps {
  onScan: (data: string) => void
  onError: (error: string) => void
}

export default function QRScannerTest({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const lastScanTime = useRef<number>(0)
  const [cameraSupported, setCameraSupported] = useState(true)
  const [environmentMessage, setEnvironmentMessage] = useState("")

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugInfo(prev => [...prev.slice(-8), logMessage])
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hostname = window.location.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
    const secure = window.isSecureContext || isLocal
    const mediaSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

    if (!secure) {
      const message = "Browser memblokir akses kamera karena situs belum menggunakan HTTPS. Gunakan koneksi https atau gunakan unggah gambar."
      setEnvironmentMessage(message)
      setError(message)
      addDebugInfo("Camera blocked: insecure context")
    } else if (!mediaSupported) {
      const message = "Peramban tidak mendukung akses kamera (getUserMedia)."
      setEnvironmentMessage(message)
      setError(message)
      addDebugInfo("Camera unsupported on this device")
    }

    setCameraSupported(secure && mediaSupported)
  }, [])

  const handleScan = (result: any) => {
    try {
      // Prevent duplicate scans too quickly
      const now = Date.now()
      if (now - lastScanTime.current < 2000) {
        return
      }
      lastScanTime.current = now

      let data = ""
      
      // Handle different result formats
      if (typeof result === 'string') {
        data = result
      } else if (result && typeof result === 'object') {
        // Try different properties that might contain the data
        data = result.text || result.data || result.raw || result.value || ""
      }

      if (!data) {
        addDebugInfo("QR detected but no data extracted")
        return
      }

      addDebugInfo(`QR Data detected: "${data.substring(0, 100)}..."`)
      
      // Validate and process the data
      if (validateQRData(data)) {
        setSuccess("QR Code berhasil terbaca!")
        addDebugInfo("Valid QR data, calling onScan callback")
        onScan(data)
        setIsScanning(false)
      } else {
        addDebugInfo("QR data validation failed")
        setError("Format QR code tidak dikenali untuk sistem ini")
      }

    } catch (err) {
      addDebugInfo(`Scan processing error: ${err}`)
      setError("Terjadi kesalahan saat memproses QR code")
    }
  }

  const handleError = (error: any) => {
    let errorMessage = "QR Scanner error"
    
    if (typeof error === 'string') {
      errorMessage = error
    } else if (error && error.message) {
      errorMessage = error.message
    } else if (error && error.name) {
      if (error.name === 'NotAllowedError') {
        errorMessage = "Izin kamera ditolak. Refresh halaman dan izinkan akses kamera."
      } else if (error.name === 'NotFoundError') {
        errorMessage = "Kamera tidak ditemukan pada perangkat ini."
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Kamera sedang digunakan oleh aplikasi lain."
      }
    }

    addDebugInfo(`Scanner error: ${errorMessage}`)
    setError(errorMessage)
    onError(errorMessage)
  }

  const processImageFile = (file: File) => {
    return new Promise<ImageData>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(img.src)
        resolve(imageData)
      }
      img.onerror = () => reject(new Error('Gagal membaca gambar'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError("")
    setSuccess("")
    addDebugInfo(`Processing uploaded file: ${file.name}`)

    try {
      const imageData = await processImageFile(file)
      const jsQR = (await import('jsqr')).default
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && code.data) {
        addDebugInfo("QR detected from uploaded image")
        setSuccess("QR code berhasil dibaca dari gambar")
        onScan(code.data)
      } else {
        setError("Tidak menemukan QR code pada gambar")
        addDebugInfo("Uploaded image did not contain QR data")
      }
    } catch (uploadErr) {
      console.error(uploadErr)
      addDebugInfo(`Upload scan error: ${uploadErr}`)
      setError("Gagal memproses gambar QR")
    }
  }

  const validateQRData = (data: string): boolean => {
    const cleanData = data.trim()
    
    if (!cleanData) {
      return false
    }

    // Try parsing as JSON (expected format)
    try {
      const parsed = JSON.parse(cleanData)
      if (parsed.redeemCode && parsed.userId) {
        addDebugInfo("Valid JSON QR format detected")
        return true
      }
    } catch (e) {
      // Not JSON, continue with other checks
    }

    // Check if it's a redeem code (8 characters, alphanumeric)
    if (/^[A-Z0-9]{8}$/.test(cleanData)) {
      addDebugInfo("Valid redeem code format detected")
      return true
    }

    // Check if it's ITERA format
    if (cleanData.startsWith('ITERA') && cleanData.length > 13) {
      addDebugInfo("ITERA format QR detected")
      return true
    }

    // Allow any reasonable length data (fallback)
    if (cleanData.length >= 8 && cleanData.length <= 1000) {
      addDebugInfo("Generic valid QR data detected")
      return true
    }

    return false
  }

  const startScanning = () => {
    setError("")
    setSuccess("")
    setDebugInfo([])
    setIsScanning(true)
    addDebugInfo("Starting QR scanner...")
  }

  const stopScanning = () => {
    setIsScanning(false)
    addDebugInfo("QR scanner stopped")
  }

  const testCallback = () => {
    addDebugInfo("Testing callback with dummy data...")
    const testData = JSON.stringify({
      userId: "test-user-123",
      redeemCode: "TEST1234",
      sessionId: "test-session-456", 
      timestamp: Date.now()
    })
    onScan(testData)
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Scanner Container */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cameraSupported && isScanning ? (
              <div className="space-y-4">
                <div className="relative">
                  <BarcodeScannerComponent
                    width={400}
                    height={300}
                    onUpdate={(err: any, result: any) => {
                      if (result) {
                        handleScan(result)
                      }
                      if (err && err.name !== 'NotFoundException') {
                        // Only handle real errors, not "QR not found" errors
                        handleError(err)
                      }
                    }}
                    stopStream={!isScanning}
                  />
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-green-500 rounded-lg animate-pulse">
                      <div className="w-full h-full border border-dashed border-green-500/50 rounded-lg" />
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" onClick={stopScanning} className="w-full">
                  <CameraOff className="mr-2 h-4 w-4" />
                  Stop Scanner
                </Button>
              </div>
            ) : cameraSupported ? (
              <div className="text-center space-y-4">
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">QR Scanner tidak aktif</p>
                  <p className="text-sm text-gray-500">Klik tombol untuk memulai scanning</p>
                </div>
                
                <Button onClick={startScanning} className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Mulai Scan QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 border border-dashed border-red-200 rounded-lg text-center bg-red-50">
                  <p className="font-semibold text-red-800">Kamera tidak dapat digunakan</p>
                  <p className="text-sm text-red-700 mt-2">
                    {environmentMessage || "Browser memblokir akses kamera. Gunakan koneksi HTTPS atau unggah foto QR di bawah ini."}
                  </p>
                </div>
              </div>
            )}

            {/* Test button */}
            <Button variant="secondary" onClick={testCallback} className="w-full">
              Test Callback
            </Button>

            {/* Upload fallback */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Atau unggah foto QR code</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-muted-foreground border border-dashed border-muted rounded-lg p-2 cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Fitur ini dapat digunakan ketika kamera diblokir atau perangkat tidak mendukung pemindaian langsung.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {debugInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
              {debugInfo.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>Arahkan kamera ke QR code mahasiswa</p>
        <p>Scanner akan otomatis mendeteksi dan memproses QR code</p>
        <p className="text-xs">Pastikan QR code jelas terlihat dan pencahayaan cukup</p>
      </div>
    </div>
  )
}