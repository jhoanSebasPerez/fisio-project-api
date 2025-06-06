import { useState, useEffect } from 'react';
import { DayOfWeek, dayOfWeekLabels, ScheduleFilters } from '@/types/schedule';
import { toast } from '@/components/ui/use-toast';
import { Filter, X } from 'lucide-react';

interface TherapistOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

interface ScheduleFiltersProps {
  onFilterChange: (filters: ScheduleFilters) => void;
  initialFilters?: ScheduleFilters;
}

export default function ScheduleFiltersComponent({
  onFilterChange,
  initialFilters = {},
}: ScheduleFiltersProps) {
  const [filters, setFilters] = useState<ScheduleFilters>(initialFilters);
  const [therapistOptions, setTherapistOptions] = useState<TherapistOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar opciones de terapeutas y servicios al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Cargar fisioterapeutas
        const therapistsResponse = await fetch('/api/therapists');
        if (!therapistsResponse.ok) {
          throw new Error('Error al cargar los fisioterapeutas');
        }
        const therapistsData = await therapistsResponse.json();
        setTherapistOptions(therapistsData);
        
        // Cargar servicios activos
        const servicesResponse = await fetch('/api/services?activeOnly=true');
        if (!servicesResponse.ok) {
          throw new Error('Error al cargar los servicios');
        }
        const servicesData = await servicesResponse.json();
        setServiceOptions(servicesData);
      } catch (error: any) {
        console.error('Error cargando datos:', error);
        toast({
          title: "Error",
          description: error.message || 'No se pudieron cargar los datos',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTherapistChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const therapistId = event.target.value || undefined;
    const newFilters = { ...filters, therapistId };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handleServiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = event.target.value || undefined;
    const newFilters = { ...filters, serviceId };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const dayValue = event.target.value as DayOfWeek | '';
    const newFilters = {
      ...filters,
      dayOfWeek: dayValue ? (dayValue as DayOfWeek) : undefined
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    const emptyFilters: ScheduleFilters = {};
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fisioterapeuta
          </label>
          <select
            value={filters.therapistId || ''}
            onChange={handleTherapistChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Todos los fisioterapeutas</option>
            {therapistOptions.map((therapist) => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Servicio
          </label>
          <select
            value={filters.serviceId || ''}
            onChange={handleServiceChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Todos los servicios</option>
            {serviceOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - ${service.price}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Día de la semana
          </label>
          <select
            value={filters.dayOfWeek || ''}
            onChange={handleDayChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los días</option>
            {Object.entries(DayOfWeek).map(([key, value]) => (
              <option key={key} value={value}>
                {dayOfWeekLabels[value]}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Botón para limpiar filtros */}
      {(filters.therapistId || filters.dayOfWeek || filters.serviceId) && (
        <div className="flex justify-end">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            type="button"
          >
            <X size={14} />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
