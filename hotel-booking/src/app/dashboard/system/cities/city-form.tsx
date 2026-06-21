'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, UploadCloud, X } from 'lucide-react';

interface CityFormProps {
  initialData?: {
    id: number;
    name: string;
    image_url: string | null;
    is_active: boolean;
  };
  isEditing?: boolean;
}

export default function CityForm({ initialData, isEditing = false }: CityFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [image_url, setImageUrl] = useState(initialData?.image_url || '');
  const [fileUploading, setFileUploading] = useState(false);
  const [is_active, setIsActive] = useState(initialData?.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const payload = {
          name: name.trim(),
          image_url: image_url ? image_url : null,
          is_active,
        };

      const url = isEditing
        ? `/api/system-admin/cities/${initialData?.id}`
        : '/api/system-admin/cities';

      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
          // Show validation issues if provided
          if (data.errors && Array.isArray(data.errors)) {
            setError(data.errors.map((e: any) => e.message).join('; '))
          } else {
            setError(data.message || 'Failed to save city')
          }
        return;
      }

      router.push('/dashboard/system/cities');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit City' : 'Add New City'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update city details'
            : 'Create a new city for the platform'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* City Name */}
          <div>
            <label className="block text-sm font-medium mb-2">City Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dhaka, Sylhet"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">City Image</label>
            <div className="flex items-center gap-3">
              <input
                id="city-image-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  setError('')
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = async () => {
                    const dataUrl = reader.result as string
                    try {
                      setFileUploading(true)
                      const res = await fetch('/api/system-admin/uploads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: file.name, data: dataUrl, uploadSubDir: 'cities' }),
                      })
                      const json = await res.json()
                      if (!res.ok) {
                        setError(json.message || 'Upload failed')
                        return
                      }
                      // Store relative upload path returned by server (e.g. /uploads/cities/xyz.jpg)
                      const uploadedUrl = json.url
                      setImageUrl(uploadedUrl)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload error')
                    } finally {
                      setFileUploading(false)
                    }
                  }
                  reader.readAsDataURL(file)
                }}
              />

              <label
                htmlFor="city-image-file"
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition"
              >
                <UploadCloud className="h-4 w-4" />
                <span className="text-sm font-medium">{fileUploading ? 'Uploading...' : 'Upload Image'}</span>
              </label>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{image_url ? image_url.split('/').pop() : 'No file chosen'}</span>
                {image_url && !fileUploading && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                  >
                    <X className="h-4 w-4" /> Remove
                  </button>
                )}
              </div>
            </div>

            {image_url && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <img
                  src={image_url}
                  alt="City preview"
                  className="max-h-40 rounded-md object-cover"
                  onError={() => setError('Invalid image URL')}
                />
              </div>
            )}
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={is_active}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update City' : 'Create City'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
