'use client';

import { useState } from 'react';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Search
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Therapist {
  id: string;
  name: string;
  email: string;
}

interface AppointmentFiltersProps {
  filters: {
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    therapistId: string;
    patientName: string;
  };
  onFilterChange: (filters: any) => void;
  therapists: Therapist[];
}

export function AppointmentFilters({
  filters,
  onFilterChange,
  therapists
}: AppointmentFiltersProps) {

  return (
    <div className="mb-6 p-4 bg-gray-100 rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Filtro por fecha de inicio */}
          <div>
            <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700">Fecha inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="startDateFilter"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm flex items-center justify-between"
                >
                  <span>
                    {filters.startDate ? (
                      format(filters.startDate, "dd MMM yyyy", { locale: es })
                    ) : (
                      <span className="text-gray-400">Seleccionar fecha</span>
                    )}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.startDate || undefined}
                  onSelect={(date) => onFilterChange({ startDate: date })}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por fecha de fin */}
          <div>
            <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700">Fecha fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  id="endDateFilter"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm flex items-center justify-between"
                >
                  <span>
                    {filters.endDate ? (
                      format(filters.endDate, "dd MMM yyyy", { locale: es })
                    ) : (
                      <span className="text-gray-400">Seleccionar fecha</span>
                    )}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.endDate || undefined}
                  onSelect={(date) => onFilterChange({ endDate: date })}
                  initialFocus
                  locale={es}
                  disabled={(date) =>
                    filters.startDate ? date < filters.startDate : false
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por estado */}
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Estado</label>
            <select
              id="statusFilter"
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="SCHEDULED">Agendada</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="RESCHEDULED">Reprogramada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="COMPLETED">Completada</option>
            </select>
          </div>

          {/* Filtro por terapeuta */}
          <div>
            <label htmlFor="therapistFilter" className="block text-sm font-medium text-gray-700">Terapeuta</label>
            <select
              id="therapistFilter"
              value={filters.therapistId}
              onChange={(e) => onFilterChange({ therapistId: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Todos los terapeutas</option>
              {therapists.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda por nombre de paciente */}
          <div>
            <label htmlFor="patientNameFilter" className="block text-sm font-medium text-gray-700">Nombre del paciente</label>
            <div className="relative">
              <input
                id="patientNameFilter"
                type="text"
                placeholder="Buscar por nombre"
                value={filters.patientName}
                onChange={(e) => onFilterChange({ patientName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 text-right">
          <button
            onClick={() => {
              // Mantener la lógica actual, cada cambio ya aplica el filtro
              // Este botón es principalmente por coherencia visual
            }}
            className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded"
          >
            Aplicar Filtros
          </button>
        </div>
    </div>
  );
}
