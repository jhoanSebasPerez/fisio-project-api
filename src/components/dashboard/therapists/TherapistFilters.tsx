// src/components/dashboard/therapists/TherapistFilters.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Service } from '@/types/therapist';

interface TherapistFiltersProps {
  onFilterChange: (filters: { name?: string; phone?: string; serviceId?: string }) => void;
}

export default function TherapistFilters({ onFilterChange }: TherapistFiltersProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Ensure you have an API endpoint /api/services that returns all services
        const response = await fetch('/api/services');
        if (!response.ok) {
          throw new Error('Failed to fetch services for filter');
        }
        const data = await response.json();
        setAvailableServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };
    fetchServices();
  }, []);

  const handleApplyFilters = () => {
    onFilterChange({ name: name.trim(), phone: phone.trim(), serviceId });
  };

  return (
    <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label htmlFor="nameFilter" className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            id="nameFilter"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Buscar por nombre"
          />
        </div>
        <div>
          <label htmlFor="phoneFilter" className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input
            type="text"
            id="phoneFilter"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Buscar por teléfono"
          />
        </div>
        <div>
          <label htmlFor="serviceFilter" className="block text-sm font-medium text-gray-700">Servicio</label>
          <select
            id="serviceFilter"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Todos los servicios</option>
            {availableServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 text-right">
        <button
          onClick={handleApplyFilters}
          className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
