'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Edit2, Loader2, Plus, Trash2, Search, X } from 'lucide-react';

interface City {
  id: number;
  name: string;
  image_url: string | null;
  is_active: boolean;
  _count?: { hotels: number };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  const [cities, setCities] = useState<City[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(search);
  const [deleteCity, setDeleteCity] = useState<City | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (search) params.append('search', search);

        const res = await fetch(`/api/system-admin/cities?${params}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to fetch cities');
          return;
        }

        setCities(data.data.cities);
        setPagination(data.data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, [page, search]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (searchInput) newParams.append('search', searchInput);
    newParams.append('page', '1');
    router.push(`?${newParams.toString()}`);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteCity) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/system-admin/cities/${deleteCity.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to delete city');
        setDeleteCity(null);
        return;
      }

      // Show message based on response
      alert(data.message || 'City deleted successfully');
      setDeleteCity(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeleteCity(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getHotelCount = (city: City) => city._count?.hotels || 0;
  const hasHotels = (city: City) => getHotelCount(city) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cities</h1>
          <p className="text-muted-foreground mt-1">
            Manage destinations for the platform
          </p>
        </div>
        <Link href="/dashboard/system/cities/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add City
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search cities..."
            className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : cities.length === 0 ? (
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No cities found</p>
        </div>
      ) : (
        <>
          {/* Cities Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">City Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Image</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Hotels</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cities.map((city) => (
                  <tr key={city.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{city.name}</td>
                    <td className="px-6 py-4 text-sm">
                      {city.image_url ? (
                        <img
                          src={city.image_url}
                          alt={city.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">No image</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {getHotelCount(city)} hotel{getHotelCount(city) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {city.is_active ? (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 text-xs font-medium dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 text-xs font-medium dark:text-amber-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right flex justify-end gap-2">
                      <Link href={`/dashboard/system/cities/${city.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={hasHotels(city) ? 'outline' : 'destructive'}
                        onClick={() => setDeleteCity(city)}
                        className="flex items-center gap-1"
                        title={hasHotels(city) ? 'Hotels exist in this city' : 'Delete city'}
                      >
                        <Trash2 className="h-4 w-4" />
                        {hasHotels(city) ? 'Deactivate' : 'Delete'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <Link
                    key={pageNum}
                    href={`?page=${pageNum}${search ? `&search=${search}` : ''}`}
                  >
                    <Button
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">
                    {hasHotels(deleteCity) ? 'Deactivate City' : 'Delete City'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Confirm this action</p>
                </div>
                <button
                  onClick={() => setDeleteCity(null)}
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Message */}
              <div className="text-sm space-y-2">
                {hasHotels(deleteCity) ? (
                  <>
                    <p>
                      This city has <strong>{getHotelCount(deleteCity)} hotel(s)</strong> associated with it.
                    </p>
                    <p className="text-muted-foreground">
                      The city will be deactivated but not permanently deleted because hotels reference it. You can edit it later if needed.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    This action cannot be undone. The city will be permanently deleted.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteCity(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant={hasHotels(deleteCity) ? 'outline' : 'destructive'}
                  className="flex items-center gap-2"
                >
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isDeleting
                    ? 'Processing...'
                    : hasHotels(deleteCity)
                    ? 'Deactivate'
                    : 'Delete'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
