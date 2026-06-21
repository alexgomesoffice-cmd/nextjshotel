'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CityForm from '../city-form';
import { Loader2 } from 'lucide-react';

interface City {
  id: number;
  name: string;
  image_url: string | null;
  is_active: boolean;
}

export default function EditCityPage() {
  const params = useParams();
  const cityId = params.id as string;
  const [city, setCity] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCity = async () => {
      try {
        const res = await fetch(`/api/system-admin/cities/${cityId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to load city');
          return;
        }

        setCity(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCity();
  }, [cityId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !city) {
    return (
      <div className="p-6 border border-destructive/50 rounded-lg bg-destructive/10">
        <p className="text-destructive font-medium">{error || 'City not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit City</h1>
        <p className="text-muted-foreground mt-1">Update city details</p>
      </div>
      <CityForm initialData={city} isEditing />
    </div>
  );
}
