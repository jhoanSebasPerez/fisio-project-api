'use client';

import { useState } from 'react';
import { ServiceFiltersType } from '@/types/service';
import { Search, FilterX, Filter } from 'lucide-react';

interface ServiceFiltersProps {
  filters: ServiceFiltersType;
  onApplyFilters: (filters: ServiceFiltersType) => void;
}

export function ServiceFilters({ filters, onApplyFilters }: ServiceFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ServiceFiltersType>({
    name: filters.name,
    activeOnly: filters.activeOnly
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setLocalFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
  };

  return (
    <div className="border-b border-gray-200 pb-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Filter size={16} /> Filtros
        </h3>
        {(localFilters.name !== '' || !localFilters.activeOnly) && (
          <button
            type="button"
            onClick={() => {
              setLocalFilters({ name: '', activeOnly: true });
              onApplyFilters({ name: '', activeOnly: true });
            }}
            className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
          >
            <FilterX size={14} /> Limpiar filtros
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del servicio
          </label>
          <div className="relative">
            <input
              type="text"
              name="name"
              id="name"
              value={localFilters.name}
              onChange={handleChange}
              className="pl-14 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3"
              placeholder="Buscar por nombre..."
            />
          </div>
        </div>

        <div className="flex items-center min-w-[200px]">
          <input
            id="activeOnly"
            name="activeOnly"
            type="checkbox"
            checked={localFilters.activeOnly}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="activeOnly" className="ml-2 block text-sm text-gray-700">
            Mostrar solo servicios activos
          </label>
        </div>

        <div>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>
    </div>
  );
}
