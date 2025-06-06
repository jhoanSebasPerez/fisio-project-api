'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { TherapistSelector } from './TherapistSelector';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Tag,
  CreditCard,
  CheckCircle,
  X,
  RefreshCw,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
  onAppointmentUpdated?: (updatedAppointment: Appointment) => void;
}

export function AppointmentDetails({
  appointment,
  onClose,
  onStatusChange,
  onAppointmentUpdated
}: AppointmentDetailsProps) {
  const { toast } = useToast();
  const [isReassigning, setIsReassigning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Calcular el precio total de los servicios
  const totalPrice = appointment.appointmentServices.reduce(
    (sum, as) => sum + as.service.price,
    0
  );

  // Calcular la duración total en minutos
  const totalDuration = appointment.appointmentServices.reduce(
    (sum, as) => sum + as.service.duration,
    0
  );

  // Traducir estado a español
  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'CONFIRMED': 'Confirmada',
      'RESCHEDULED': 'Reprogramada',
      'CANCELLED': 'Cancelada',
      'COMPLETED': 'Completada'
    };
    return translations[status] || status;
  };

  // Obtener el color de la insignia según el estado
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-700 border border-blue-300';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-700 border border-purple-300';
      case 'RESCHEDULED':
        return 'bg-amber-100 text-amber-700 border border-amber-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border border-red-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  };

  // Obtener color para el punto indicador
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-600';
      case 'SCHEDULED':
        return 'bg-purple-600';
      case 'RESCHEDULED':
        return 'bg-amber-600';
      case 'CANCELLED':
        return 'bg-red-600';
      case 'COMPLETED':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMMM yyyy - HH:mm", { locale: es });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Función para manejar la reasignación de fisioterapeuta
  const handleReassignTherapist = async (therapistId: string) => {
    if (!therapistId) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          therapistId,
          status: appointment.status, // Mantener el mismo estado
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al reasignar la cita');
      }

      const updatedAppointment = await response.json();
      toast({
        title: 'Cita reasignada',
        description: `La cita ha sido reasignada a ${updatedAppointment.therapist?.name || 'otro fisioterapeuta'}.`,
      });

      // Notificar al componente padre sobre el cambio
      if (onAppointmentUpdated) {
        onAppointmentUpdated(updatedAppointment);
      }

      // Ocultar el selector después de reasignar
      setIsReassigning(false);
    } catch (error: any) {
      console.error('Error al reasignar fisioterapeuta:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo reasignar la cita',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <div className="flex items-center gap-2 mb-6">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusColorClasses(appointment.status)}`}>
                <span className={`h-2 w-2 rounded-full ${getStatusDotColor(appointment.status)}`}></span>
                {translateStatus(appointment.status)}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          {/* Columna izquierda: Información de la cita */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Información de la cita</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="text-slate-600 w-4 h-4" />
                  <span className="text-sm font-medium">Fecha:</span>
                  <span className="text-sm">
                    {formatDate(appointment.date)}
                  </span>
                </div>

                <div className="flex items-start space-x-2">
                  <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Duración estimada</p>
                    <p className="text-sm text-muted-foreground">
                      {totalDuration} minutos
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <CreditCard className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Precio total</p>
                    <p className="text-sm text-muted-foreground">
                      ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Tag className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="mt-6">
                    <h4 className="font-medium text-slate-800 mb-2">Fisioterapeuta</h4>
                    <p className="text-sm text-muted-foreground">
                      {appointment.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="mt-6">
              <h4 className="font-medium text-slate-800 mb-2">Servicios</h4>
              <div className="space-y-3">
                {appointment.appointmentServices.map((as) => (
                  <div key={as.id} className="flex items-center justify-between border rounded-md p-2">
                    <div className="flex items-center space-x-2">
                      {as.service.imageUrl && (
                        <div className="w-10 h-10 rounded overflow-hidden">
                          <img
                            src={as.service.imageUrl}
                            alt={as.service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{as.service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {as.service.duration} min - ${as.service.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna derecha: Información del paciente y terapeuta */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Información del paciente</h3>
              <div className="space-y-2 border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <User className="text-slate-600 w-4 h-4" />
                  <span className="text-sm font-medium">Paciente:</span>
                  <span className="text-sm">
                    {appointment.patient.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="text-slate-600 w-4 h-4" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">
                    {appointment.patient.email}
                  </span>
                </div>

                {appointment.patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="text-slate-600 w-4 h-4" />
                    <span className="text-sm font-medium">Teléfono:</span>
                    <span className="text-sm">
                      {appointment.patient.phone || 'No disponible'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fisioterapeuta asignado */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Fisioterapeuta asignado</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsReassigning(!isReassigning)}
                  className="text-xs flex items-center gap-1 h-7 px-2 py-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isReassigning ? 'Cancelar' : 'Reasignar'}
                </Button>
              </div>
              
              {isReassigning ? (
                <div className="mb-4 p-3 border rounded-md">
                  <p className="text-sm text-slate-500 mb-2">Selecciona un nuevo fisioterapeuta para esta cita:</p>
                  <TherapistSelector 
                    currentTherapistId={appointment.therapist?.id} 
                    onSelect={handleReassignTherapist}
                    disabled={isLoading}
                  />
                </div>
              ) : appointment.therapist ? (
                <div className="space-y-2 border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <User className="text-slate-600 w-4 h-4" />
                    <span className="text-sm font-medium">Fisioterapeuta:</span>
                    <span className="text-sm">
                      {appointment.therapist.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="text-slate-600 w-4 h-4" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">
                      {appointment.therapist.email}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-500 border border-amber-200 bg-amber-50 rounded-md p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No hay fisioterapeuta asignado a esta cita
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-slate-800 mb-2">Cambiar estado</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs border ${appointment.status === 'CONFIRMED' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'}`}
                  onClick={() => onStatusChange(appointment.id, 'CONFIRMED')}
                  disabled={appointment.status === 'CONFIRMED'}
                >
                  <CheckCircle className="h-4 w-4" /> Confirmar
                </button>

                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs border ${appointment.status === 'SCHEDULED' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200'}`}
                  onClick={() => onStatusChange(appointment.id, 'SCHEDULED')}
                  disabled={appointment.status === 'SCHEDULED'}
                >
                  <RefreshCw className="h-4 w-4" /> Reprogramar
                </button>

                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs border ${appointment.status === 'CANCELLED' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                  onClick={() => onStatusChange(appointment.id, 'CANCELLED')}
                  disabled={appointment.status === 'CANCELLED'}
                >
                  <X className="h-4 w-4" />
                  Cancelada
                </button>

                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium text-xs border ${appointment.status === 'COMPLETED' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'}`}
                  onClick={() => onStatusChange(appointment.id, 'COMPLETED')}
                  disabled={appointment.status === 'COMPLETED'}
                >
                  <CheckCircle className="h-4 w-4" /> Completar
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button 
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={onClose}
          >
            <X size={16} /> Cerrar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
