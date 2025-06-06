'use client';

import { useState, useEffect } from 'react';
import { Schedule, ScheduleFilters } from '@/types/schedule';
import { toast } from '@/components/ui/use-toast';

import ScheduleFiltersComponent from '@/components/dashboard/schedules/ScheduleFilters';
import ScheduleList from '@/components/dashboard/schedules/ScheduleList';
import CreateScheduleForm from '@/components/dashboard/schedules/CreateScheduleForm';
import { CalendarDays, PlusCircle, Filter, ListFilter } from 'lucide-react';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<Schedule[]>([]);
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'create'>('list'); // Para dispositivos móviles

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.therapistId) {
        queryParams.append('therapistId', filters.therapistId);
      }
      
      // Asegurarse de que se incluyan los servicios en la respuesta
      queryParams.append('includeServices', 'true');
      
      const response = await fetch(`/api/schedules?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar los horarios');
      }
      
      const data = await response.json();
      setSchedules(data);
      applyFilters(data);
    } catch (error: any) {
      console.error('Error cargando horarios:', error);
      toast({
        title: "Error",
        description: error.message || 'No se pudieron cargar los horarios',
        variant: "destructive",
      });
      setSchedules([]);
      setFilteredSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.therapistId]);

  const applyFilters = (schedulesData: Schedule[]) => {
    let filtered = [...schedulesData];
    
    if (filters.dayOfWeek) {
      filtered = filtered.filter(schedule => schedule.dayOfWeek === filters.dayOfWeek);
    }
    
    setFilteredSchedules(filtered);
  };

  const handleFilterChange = (newFilters: ScheduleFilters) => {
    setFilters(newFilters);
    
    if (newFilters.therapistId !== filters.therapistId) {
      // Si cambia el terapeuta, cargar nuevos horarios desde el servidor
      // (esto se maneja en el useEffect)
    } else {
      // Si solo cambia el día, aplicar el filtro localmente
      applyFilters(schedules);
    }
  };

  const handleScheduleCreated = () => {
    fetchSchedules();
    toast({
      title: "Éxito",
      description: "Horario creado correctamente",
    });
  };

  const handleScheduleDeleted = () => {
    fetchSchedules();
  };

  const handleScheduleUpdated = (updatedSchedule: Schedule) => {
    // Actualizar el horario en la lista local
    const updatedSchedules = schedules.map(schedule => 
      schedule.id === updatedSchedule.id ? updatedSchedule : schedule
    );
    
    setSchedules(updatedSchedules);
    applyFilters(updatedSchedules);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Horarios</h1>
        </div>
        <div className="text-sm text-gray-500">
          Asigna horarios y servicios disponibles para cada fisioterapeuta
        </div>
      </div>

      {/* Vista para pantallas medianas y grandes */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-4">
              <Filter size={18} />
              <h2>Filtros</h2>
            </div>
            <ScheduleFiltersComponent 
              onFilterChange={handleFilterChange}
              initialFilters={filters}
            />
          </div>

          <ScheduleList 
            schedules={filteredSchedules}
            isLoading={isLoading}
            onScheduleDeleted={handleScheduleDeleted}
            onScheduleUpdated={handleScheduleUpdated}
          />
        </div>

        <div>
          <CreateScheduleForm 
            onScheduleCreated={handleScheduleCreated}
            therapistId={filters.therapistId}
          />
        </div>
      </div>

      {/* Vista para pantallas móviles con botones de cambio */}
      <div className="md:hidden">
        {/* Botones de navegación para dispositivos móviles */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <button 
            className={`flex-1 py-3 px-4 flex justify-center items-center gap-2 ${activeView === 'list' ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-white text-gray-600'}`}
            onClick={() => setActiveView('list')}
          >
            <ListFilter size={18} />
            Ver Horarios
          </button>
          <button 
            className={`flex-1 py-3 px-4 flex justify-center items-center gap-2 ${activeView === 'create' ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-white text-gray-600'}`}
            onClick={() => setActiveView('create')}
          >
            <PlusCircle size={18} />
            Añadir Nuevo
          </button>
        </div>

        {/* Contenido según la vista activa */}
        {activeView === 'list' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <ScheduleFiltersComponent 
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </div>
            <ScheduleList 
              schedules={filteredSchedules}
              isLoading={isLoading}
              onScheduleDeleted={handleScheduleDeleted}
              onScheduleUpdated={handleScheduleUpdated}
            />
          </div>
        )}

        {activeView === 'create' && (
          <CreateScheduleForm 
            onScheduleCreated={() => {
              handleScheduleCreated();
              setActiveView('list'); // Cambiar a la vista de lista después de crear
            }}
            therapistId={filters.therapistId}
          />
        )}
      </div>
    </div>
  );
}
