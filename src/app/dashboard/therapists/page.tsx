// src/app/dashboard/therapists/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import TherapistFilters from '@/components/dashboard/therapists/TherapistFilters';
import TherapistList from '@/components/dashboard/therapists/TherapistList';
import { Therapist } from '@/types/therapist';

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: '', phone: '', serviceId: '' });

  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (filters.name) queryParams.append('name', filters.name);
    if (filters.phone) queryParams.append('phone', filters.phone);
    if (filters.serviceId) queryParams.append('serviceId', filters.serviceId);

    try {
      const response = await fetch(`/api/therapists?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch therapists');
      }
      const data = await response.json();
      setTherapists(data);
    } catch (error) {
      console.error(error);
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTherapists();
  }, [fetchTherapists]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fisioterapeutas</h1>
        <Link href="/dashboard/therapists/new" legacyBehavior>
          <button className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded text-md">
            Agregar Fisioterapeuta
          </button>
        </Link>
      </div>

      <TherapistFilters onFilterChange={handleFilterChange} />

      {loading ? (
        <p className="text-center py-8">Cargando fisioterapeutas...</p>
      ) : (
        <TherapistList therapists={therapists} onRefresh={fetchTherapists} />
      )}
    </div>
  );
}
