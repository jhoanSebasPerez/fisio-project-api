import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarClock, Plus, Info, Clock, BadgeDollarSign } from 'lucide-react';

import { toast } from '@/components/ui/use-toast';
import { DayOfWeek, dayOfWeekLabels } from '@/types/schedule';

// Interfaces para los datos
interface TherapistOption {
  id: string;
  name: string;
  email: string;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

// Esquema de validación para el formulario
const createScheduleSchema = z.object({
  therapistId: z.string().min(1, 'El fisioterapeuta es requerido'),
  dayOfWeek: z.nativeEnum(DayOfWeek, {
    required_error: 'El día es requerido',
    invalid_type_error: 'Seleccione un día válido',
  }),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  serviceId: z.string().min(1, 'Debe seleccionar un servicio'),
  isActive: z.boolean().default(true),
});

type CreateScheduleFormData = z.infer<typeof createScheduleSchema>;

interface CreateScheduleFormProps {
  onScheduleCreated: () => void;
  therapistId?: string; // ID del terapeuta preseleccionado (opcional)
}

export default function CreateScheduleForm({
  onScheduleCreated,
  therapistId
}: CreateScheduleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [calculatedEndTime, setCalculatedEndTime] = useState<string>('');  // Para mostrar la hora de fin calculada

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<CreateScheduleFormData>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      therapistId: therapistId || '',
      serviceId: '',
      startTime: '',
      dayOfWeek: undefined,
      isActive: true,
    },
  });
  
  // Observar cambios en la hora de inicio y servicio seleccionado
  const watchedStartTime = watch('startTime');
  const watchedServiceId = watch('serviceId');

  // Cargar lista de terapeutas al montar
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const response = await fetch('/api/therapists');

        if (!response.ok) {
          throw new Error('Error al cargar los fisioterapeutas');
        }

        const data = await response.json();
        setTherapists(data);
        setIsLoaded(true);

        // Si hay un therapistId proporcionado, establecerlo
        if (therapistId) {
          setValue('therapistId', therapistId);
        }
      } catch (error) {
        console.error('Error cargando fisioterapeutas:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los fisioterapeutas. Por favor, intenta nuevamente.',
          variant: 'destructive',
        });
      }
    };

    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services?activeOnly=true');

        if (!response.ok) {
          throw new Error('Error al cargar los servicios');
        }

        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Error cargando servicios:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los servicios. Por favor, intenta nuevamente.',
          variant: 'destructive',
        });
      }
    };

    fetchTherapists();
    fetchServices();
  }, [therapistId, setValue]);

  // Función para calcular la hora de finalización basada en la hora de inicio y la duración del servicio
  useEffect(() => {
    if (watchedStartTime && watchedServiceId) {
      // Convertir hora de inicio a minutos desde medianoche
      const [startHour, startMinute] = watchedStartTime.split(':').map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      
      // Encontrar la duración del servicio seleccionado
      const selectedService = services.find(s => s.id === watchedServiceId);
      if (selectedService) {
        const serviceDuration = selectedService.duration;
        
        // Calcular la hora de finalización sumando la duración a la hora de inicio
        const endTimeInMinutes = startTimeInMinutes + serviceDuration;
        const endHour = Math.floor(endTimeInMinutes / 60) % 24; // Para asegurar que no pase de 24
        const endMinute = endTimeInMinutes % 60;
        
        // Formatear la hora de finalización como HH:MM
        const formattedEndHour = String(endHour).padStart(2, '0');
        const formattedEndMinute = String(endMinute).padStart(2, '0');
        setCalculatedEndTime(`${formattedEndHour}:${formattedEndMinute}`);
        return;
      }
    }
    setCalculatedEndTime('');
  }, [watchedStartTime, watchedServiceId, services]);

  const onSubmit = async (data: CreateScheduleFormData) => {
    setIsLoading(true);
    
    try {
      // Extraer serviceId y crear un nuevo objeto con la estructura correcta para el backend
      const { serviceId, ...restData } = data;
      
      // Crear el objeto final para enviar con los campos correctamente estructurados
      const submitData = {
        ...restData,
        serviceIds: [serviceId], // Convertir a array para mantener compatibilidad con el backend
        endTime: calculatedEndTime
      };
      
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el horario');
      }

      const createdSchedule = await response.json();

      toast({
        title: 'Éxito',
        description: 'Horario creado correctamente',
      });

      reset({
        therapistId: data.therapistId, // Mantener el mismo terapeuta seleccionado
        serviceId: '',
        startTime: '',
        isActive: true,
      });
      
      // Resetear la hora de finalización calculada
      setCalculatedEndTime('');

      onScheduleCreated();
    } catch (error: any) {
      console.error('Error al crear el horario:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el horario. Por favor, intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-4">
        <CalendarClock size={20} />
        <h2>Añadir Nuevo Horario</h2>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-5 flex items-start gap-2">
        <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Asigna los servicios específicos que el fisioterapeuta ofrecerá en este horario y día de la semana. Cada fisioterapeuta puede ofrecer diferentes servicios según su disponibilidad y especialización.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-5 mb-4">
          {/* Selector de terapeuta */}
          <div>
            <label
              htmlFor="therapistId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fisioterapeuta *
            </label>
            <select
              id="therapistId"
              {...register('therapistId')}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || !isLoaded || !!therapistId}
            >
              <option value="">Seleccionar fisioterapeuta</option>
              {therapists.map((therapist) => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>
            {errors.therapistId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.therapistId.message}
              </p>
            )}
          </div>

          {/* Selector de día de la semana */}
          <div>
            <label
              htmlFor="dayOfWeek"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Día de la semana *
            </label>
            <select
              id="dayOfWeek"
              {...register('dayOfWeek')}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Seleccionar día</option>
              {Object.entries(DayOfWeek).map(([key, value]) => (
                <option key={key} value={value}>
                  {dayOfWeekLabels[value]}
                </option>
              ))}
            </select>
            {errors.dayOfWeek && (
              <p className="mt-1 text-sm text-red-600">
                {errors.dayOfWeek.message}
              </p>
            )}
          </div>

          {/* Hora de inicio */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Hora de inicio *
            </label>
            <input
              type="time"
              id="startTime"
              {...register('startTime')}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startTime.message}
              </p>
            )}
          </div>

          {/* Hora de finalización calculada (solo lectura) */}
          <div>
            <label
              htmlFor="calculatedEndTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Hora de finalización (calculada)
            </label>
            <div className="relative">
              <input
                type="time"
                id="calculatedEndTime"
                value={calculatedEndTime}
                readOnly
                className="w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
              />
              {watchedServiceId && watchedStartTime && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                  Auto
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Calculada según la duración del servicio seleccionado
            </p>
          </div>
        </div>

      {/* Servicios disponibles */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Servicio disponible <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-500">
            Seleccione un servicio
          </span>
        </div>
        
        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-md">
          {services.length === 0 ? (
            <p className="text-sm text-gray-500 p-1">No hay servicios disponibles</p>
          ) : (
            services.map((service) => (
              <div key={service.id} className="flex items-start border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center h-5">
                  <input
                    id={`service-${service.id}`}
                    type="radio"
                    value={service.id}
                    {...register('serviceId')}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor={`service-${service.id}`} className="font-medium text-gray-700 cursor-pointer">
                    {service.name}
                  </label>
                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {service.duration} min
                    </span>
                    <span className="flex items-center">
                      <BadgeDollarSign className="h-3 w-3 mr-1" />
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(service.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {errors.serviceId && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceId.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          El servicio seleccionado estará disponible en este horario con este fisioterapeuta
        </p>
      </div>

        <div className="flex items-center mt-3">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isLoading}
          />
          <label
            htmlFor="isActive"
            className="ml-2 block text-sm text-gray-700"
          >
            Horario activo
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Añadiendo...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Añadir Horario
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
