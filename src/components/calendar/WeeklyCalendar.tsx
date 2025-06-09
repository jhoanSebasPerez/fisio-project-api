import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format, addWeeks, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
}

interface AppointmentService {
  id: string;
  service: Service;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Therapist {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  date: string;
  status: string;
  patient: Patient;
  therapist?: Therapist;
  appointmentServices: AppointmentService[];
}

interface TherapistWithAppointments {
  id: string;
  name: string;
  appointments: Appointment[];
}

interface CalendarDay {
  date: string;
  dateString: string;
  dayName: string;
  dayNumber: number;
  month: string;
  therapists: TherapistWithAppointments[];
}

interface CalendarResponse {
  weekStart: string;
  weekEnd: string;
  days: CalendarDay[];
}

interface WeeklyCalendarProps {
  therapistId?: string; // Opcional, usado solo por administradores
  onAppointmentClick?: (appointment: Appointment) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  therapistId,
  onAppointmentClick
}) => {
  const { data: session, status } = useSession();
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | undefined>(therapistId);
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  // Función para cargar datos del calendario
  const fetchCalendarData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Construir URL con parámetros
      let url = `/api/calendar/weekly-appointments?week=${format(currentDate, 'yyyy-MM-dd')}`;
      if (selectedTherapistId) {
        url += `&therapistId=${selectedTherapistId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data: CalendarResponse = await response.json();
      setCalendarData(data);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('No se pudo cargar el calendario. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar lista de fisioterapeutas (solo para administradores)
  const fetchTherapists = async () => {
    // Solo cargar terapeutas si el usuario es administrador
    if (session?.user?.role !== 'ADMIN') {
      return;
    }

    try {
      const response = await fetch('/api/therapists');
      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (err) {
      console.error('Error fetching therapists:', err);
    }
  };

  // Cargar datos al montar el componente o cambiar la semana o terapeuta
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCalendarData();

      // Si el usuario es administrador, cargar la lista de terapeutas
      if (session.user.role === 'ADMIN') {
        fetchTherapists();
      }
    }
  }, [currentDate, selectedTherapistId, status, session]);

  // Manejar cambio de semana
  const handleWeekChange = (direction: 'next' | 'prev') => {
    const weeksToAdd = direction === 'next' ? 1 : -1;
    setCurrentDate(addWeeks(currentDate, weeksToAdd));
  };

  // Manejar cambio de terapeuta (solo para administradores)
  const handleTherapistChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTherapistId = event.target.value === 'all' ? undefined : event.target.value;
    setSelectedTherapistId(newTherapistId);
  };

  // Formatear hora de cita
  const formatAppointmentTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return 'Horario no válido';
    return format(date, 'HH:mm', { locale: es });
  };

  // Calcular duración total de los servicios de una cita
  const calculateAppointmentDuration = (appointment: Appointment): number => {
    // Aquí podrías calcular la duración basada en los servicios asociados
    // Por ahora, asumimos un valor predeterminado
    return 60; // 60 minutos
  };

  // Mostrar servicios de una cita
  const renderAppointmentServices = (appointment: Appointment) => {
    if (!appointment.appointmentServices || appointment.appointmentServices.length === 0) {
      return <span className="text-gray-600 text-sm">Sin servicios</span>;
    }

    return (
      <div className="text-xs text-gray-600">
        {appointment.appointmentServices.map(as => (
          <span key={as.id} className="mr-1">
            {as.service?.name}
          </span>
        ))}
      </div>
    );
  };

  // Mostrar cita individual
  const renderAppointment = (appointment: Appointment) => {
    const time = formatAppointmentTime(appointment.date);
    const duration = calculateAppointmentDuration(appointment);
    
    // Determinar color según estado de la cita
    let statusColor = 'bg-blue-100 border-blue-300';
    if (appointment.status === 'COMPLETED') {
      statusColor = 'bg-green-100 border-green-300';
    } else if (appointment.status === 'CANCELLED') {
      statusColor = 'bg-red-100 border-red-300 opacity-60';
    } else if (appointment.status === 'IN_PROGRESS') {
      statusColor = 'bg-yellow-100 border-yellow-300';
    }

    return (
      <div 
        key={appointment.id}
        className={`p-2 mb-2 rounded border ${statusColor} cursor-pointer transition-all hover:shadow-md`}
        onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
      >
        <div className="flex justify-between">
          <span className="font-medium">{time}</span>
          <span className="text-xs bg-gray-200 px-2 rounded-full">{duration} min</span>
        </div>
        <div className="mt-1 font-medium">{appointment.patient.name}</div>
        {renderAppointmentServices(appointment)}
      </div>
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div className="p-4 text-center">Debe iniciar sesión para ver el calendario.</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  // Asegurarse de que hay datos de calendario para mostrar
  if (!calendarData) {
    return <div className="p-4">No hay datos de calendario disponibles.</div>;
  }
  
  // Formatear período de la semana para mostrar
  const weekStartDate = parseISO(calendarData.weekStart);
  const weekEndDate = parseISO(calendarData.weekEnd);
  const weekPeriod = `${format(weekStartDate, 'd MMM', { locale: es })} - ${format(weekEndDate, 'd MMM yyyy', { locale: es })}`;

  return (
    <div className="container mx-auto">
      {/* Controles del calendario */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-white py-4 z-10">
        <h2 className="text-xl font-semibold">Calendario de Citas</h2>
        
        <div className="flex gap-4 items-center">
          {/* Selector de terapeuta (solo para administradores) */}
          {session.user.role === 'ADMIN' && (
            <select 
              value={selectedTherapistId || 'all'}
              onChange={handleTherapistChange}
              className="border rounded p-2"
            >
              <option value="all">Todos los fisioterapeutas</option>
              {therapists.map(therapist => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>
          )}

          {/* Navegación de semanas */}
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => handleWeekChange('prev')}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              &lt;
            </button>
            
            <span className="font-medium">{weekPeriod}</span>
            
            <button 
              onClick={() => handleWeekChange('next')}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Grid del calendario */}
      <div className="grid grid-cols-7 gap-4">
        {/* Cabecera con días de la semana */}
        {calendarData.days.map((day) => (
          <div key={day.dateString} className="text-center border-b pb-2">
            <div className="font-bold">{day.dayName}</div>
            <div>{day.dayNumber} {day.month}</div>
          </div>
        ))}

        {/* Celdas con citas */}
        {calendarData.days.map((day) => (
          <div key={day.dateString} className="border rounded-lg p-2 min-h-[200px] bg-gray-50">
            {day.therapists.length === 0 ? (
              <div className="text-center text-gray-400 h-full flex items-center justify-center">
                Sin citas
              </div>
            ) : (
              day.therapists.map(therapist => (
                <div key={therapist.id} className="mb-4">
                  {/* Solo mostrar nombre del terapeuta en vista de admin con todos los terapeutas */}
                  {session.user.role === 'ADMIN' && !selectedTherapistId && (
                    <div className="font-semibold mb-1 pb-1 border-b">
                      {therapist.name}
                    </div>
                  )}
                  
                  {/* Citas del terapeuta */}
                  {therapist.appointments.map(appointment => 
                    renderAppointment(appointment)
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
