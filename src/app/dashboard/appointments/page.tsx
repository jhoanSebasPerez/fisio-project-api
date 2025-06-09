'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { AppointmentFilters } from '@/components/dashboard/appointments/AppointmentFilters';
import { AppointmentTable } from '@/components/dashboard/appointments/AppointmentTable';
import { AppointmentDetails } from '@/components/dashboard/appointments/AppointmentDetails';

// Interfaces
interface Therapist {
  id: string;
  name: string;
  email: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

interface AppointmentService {
  id: string;
  service: Service;
}

interface Appointment {
  id: string;
  date: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED';
  patient: Patient;
  therapist?: Therapist;
  appointmentServices: AppointmentService[];
  createdAt: string;
  updatedAt: string;
}

export default function AppointmentsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isTherapist = session?.user?.role === 'THERAPIST';
  
  // Si es fisioterapeuta, preestablecemos el filtro con su ID
  const initialFilters = {
    startDate: null as Date | null,
    endDate: null as Date | null,
    status: '',
    therapistId: isTherapist ? session?.user?.id || '' : '',
    patientName: '',
  };
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Cargar citas al iniciar
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        // Si es fisioterapeuta, solo mostrar sus citas
        const url = isTherapist ? 
          `/api/appointments?therapistId=${session?.user?.id}` : 
          '/api/appointments';
          
        const response = await axios.get(url);
        setAppointments(response.data);
        setFilteredAppointments(response.data);
      } catch (error) {
        console.error('Error al cargar las citas:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTherapists = async () => {
      try {
        const response = await axios.get('/api/users?role=THERAPIST');
        setTherapists(response.data);
      } catch (error) {
        console.error('Error al cargar los terapeutas:', error);
      }
    };

    fetchAppointments();
    fetchTherapists();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...appointments];

    // Filtro por fecha de inicio
    if (filters.startDate) {
      filtered = filtered.filter(appointment =>
        new Date(appointment.date) >= filters.startDate!
      );
    }

    // Filtro por fecha de fin
    if (filters.endDate) {
      filtered = filtered.filter(appointment =>
        new Date(appointment.date) <= filters.endDate!
      );
    }

    // Filtro por estado
    if (filters.status) {
      filtered = filtered.filter(appointment =>
        appointment.status === filters.status
      );
    }

    // Filtro por terapeuta
    if (filters.therapistId) {
      filtered = filtered.filter(appointment =>
        appointment.therapist?.id === filters.therapistId
      );
    }

    // Filtro por nombre de paciente (búsqueda parcial)
    if (filters.patientName) {
      const searchTerm = filters.patientName.toLowerCase();
      filtered = filtered.filter(appointment =>
        appointment.patient.name.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredAppointments(filtered);
  }, [filters, appointments]);

  // Manejadores de eventos
  const handleFilterChange = (newFilters: any) => {
    // Si es fisioterapeuta, mantener su ID en los filtros
    if (isTherapist) {
      setFilters({ 
        ...filters, 
        ...newFilters,
        therapistId: session?.user?.id || ''
      });
    } else {
      setFilters({ ...filters, ...newFilters });
    }
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      startDate: null,
      endDate: null,
      status: '',
      // Si es fisioterapeuta, mantener su ID en los filtros
      therapistId: isTherapist ? session?.user?.id || '' : '',
      patientName: '',
    };
    setFilters(clearedFilters);
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedAppointment(null);
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await axios.patch(`/api/appointments/${appointmentId}`, { status: newStatus });

      // Actualizar la lista de citas
      const updatedAppointments = appointments.map(appointment => {
        if (appointment.id === appointmentId) {
          return { ...appointment, status: newStatus as any };
        }
        return appointment;
      });

      setAppointments(updatedAppointments);

      // Si hay una cita seleccionada, actualizarla también
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus as any });
      }
    } catch (error) {
      console.error('Error al actualizar el estado de la cita:', error);
    }
  };

  // Manejar actualización de la cita (por ejemplo, cuando se reasigna un fisioterapeuta)
  const handleAppointmentUpdated = (updatedAppointment: Appointment) => {
    // Actualizar la lista de citas
    const updatedAppointments = appointments.map(appointment => {
      if (appointment.id === updatedAppointment.id) {
        return updatedAppointment;
      }
      return appointment;
    });

    setAppointments(updatedAppointments);

    // Si hay una cita seleccionada, actualizarla también
    if (selectedAppointment && selectedAppointment.id === updatedAppointment.id) {
      setSelectedAppointment(updatedAppointment);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isAdmin ? 'Gestión de Citas' : 'Mis Citas'}
        </h1>
        <Button variant="outline" onClick={handleClearFilters} className="gap-2">
          <Filter className="h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>

      <AppointmentFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        therapists={therapists}
        isAdmin={isAdmin}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Lista de Citas
            <Badge variant="outline" className="ml-2">
              {filteredAppointments.length} resultados
            </Badge>
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'Vista completa de todas las citas agendadas en el sistema' 
              : 'Vista de citas asignadas a tu agenda'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentTable
            appointments={filteredAppointments}
            loading={loading}
            onViewDetails={handleViewDetails}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>

      {showDetails && selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          onClose={handleCloseDetails}
          onStatusChange={handleStatusChange}
          onAppointmentUpdated={handleAppointmentUpdated}
        />
      )}
    </div>
  );
}
