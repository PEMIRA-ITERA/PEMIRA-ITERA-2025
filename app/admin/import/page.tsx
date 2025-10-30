'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Upload, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

export default function ImportStudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<any>(null);
  const router = useRouter();

  // Check if user is admin
  useState(() => {
    const checkAuth = async () => {
      try {
        const { user } = await ApiClient.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
          router.push('/');
          return;
        }

        setAdmin(user);
      } catch (err) {
        console.error('Auth check error:', err);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Silakan pilih file CSV yang valid');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Silakan pilih file CSV terlebih dahulu');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch('/api/import-students', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengimport data mahasiswa');
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: 'Import Berhasil',
        description: `Berhasil mengimport ${data.imported} dari ${data.total} data mahasiswa`,
      });
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengimport data');
      toast({
        title: 'Import Gagal',
        description: err.message || 'Terjadi kesalahan saat mengimport data',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Import Data Mahasiswa</h1>
            <p className="text-muted-foreground">Upload file CSV untuk mengimport data mahasiswa</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Kembali ke Dashboard
        </Button>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Upload File CSV</CardTitle>
          <CardDescription>
            Upload file CSV yang berisi data mahasiswa untuk diimport ke dalam sistem.
            Format: Nama Mahasiswa, NIM, Program Studi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="mb-4" variant="default">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Import Berhasil</AlertTitle>
              <AlertDescription>
                <p>Total data: {result.total}</p>
                <p>Berhasil diimport: {result.imported}</p>
                <p>Dilewati: {result.skipped}</p>
                {result.errors && result.errors.length > 0 && (
                  <details>
                    <summary>Detail Error ({result.errors.length})</summary>
                    <ul className="mt-2 text-sm">
                      {result.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 5 && <li>...dan {result.errors.length - 5} error lainnya</li>}
                    </ul>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!result && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button onClick={handleUpload} disabled={!file || isUploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-center">Mengimport data... {uploadProgress}%</p>
                </div>
              )}

              {file && !isUploading && (
                <p className="text-sm">
                  File terpilih: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {result && (
            <Button onClick={resetForm} variant="outline">
              Import File Lain
            </Button>
          )}
          <div className="text-sm text-muted-foreground">
            Pastikan format CSV sesuai dengan template yang ditentukan
          </div>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Petunjuk Format CSV</CardTitle>
          <CardDescription>
            Pastikan file CSV Anda memiliki format yang benar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="font-mono text-sm">Nama Mahasiswa,NIM,Program Studi</p>
              <p className="font-mono text-sm">John Doe,12345678,Teknik Informatika</p>
              <p className="font-mono text-sm">Jane Smith,87654321,Teknik Elektro</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Catatan Penting:</p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                <li>Pastikan file dalam format CSV</li>
                <li>Kolom harus berisi: Nama Mahasiswa, NIM, Program Studi</li>
                <li>NIM harus unik dan tidak boleh duplikat</li>
                <li>Password default akan diset sama dengan NIM</li>
                <li>Email akan dibuat otomatis dengan format: nim@student.itera.ac.id</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}