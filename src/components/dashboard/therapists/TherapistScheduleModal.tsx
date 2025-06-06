// src/components/dashboard/therapists/TherapistScheduleModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { Calendar, Clock, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Schedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  therapistId: string;
  therapist?: any;
  services?: any[];
  // Otros campos que pueden venir de la API
  createdAt?: string;
  updatedAt?: string;
  metadata?: any;
}

interface TherapistWithSchedules {
  id: string;
  name: string;
  schedules: Schedule[];
  services: {
    id: string;
    name: string;
  }[];
}

interface TherapistScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapistId: string;
}

export default function TherapistScheduleModal({ isOpen, onClose, therapistId }: TherapistScheduleModalProps) {
  const [therapist, setTherapist] = useState<TherapistWithSchedules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Función para traducir los días de la semana del inglés al español
  const translateDayOfWeek = (day: string): string => {
    const days: { [key: string]: string } = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes',
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes',
      'SATURDAY': 'Sábado',
      'SUNDAY': 'Domingo'
    };
    return days[day] || day;
  };

  // Función para formatear una hora en formato 24h al formato 12h con AM/PM
  const formatTime = (time: string): string => {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Ordenar los días de la semana según un orden personalizado
  const sortDays = (a: Schedule, b: Schedule) => {
    const dayOrder: { [key: string]: number } = {
      'MONDAY': 1,
      'TUESDAY': 2,
      'WEDNESDAY': 3,
      'THURSDAY': 4,
      'FRIDAY': 5,
      'SATURDAY': 6,
      'SUNDAY': 7
    };
    
    return dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
  };

  useEffect(() => {
    if (isOpen && therapistId) {
      setLoading(true);
      setError(null);
      
      // Obtener datos del fisioterapeuta con sus horarios y servicios
      const getTherapistData = async () => {
        try {
          // Obtener datos del fisioterapeuta
          const therapistResponse = await fetch(`/api/therapists/${therapistId}`);
          console.log('Respuesta de fisioterapeuta:', therapistResponse.status);
          
          if (!therapistResponse.ok) {
            throw new Error(`Error al cargar datos del fisioterapeuta: ${therapistResponse.status}`);
          }
          
          const therapistData = await therapistResponse.json();
          console.log('Datos del fisioterapeuta:', therapistData);
          
          // Obtener horarios del fisioterapeuta
          const schedulesResponse = await fetch(`/api/schedules?therapistId=${therapistId}`);
          console.log('Respuesta de horarios:', schedulesResponse.status);
          
          if (!schedulesResponse.ok) {
            throw new Error(`Error al cargar horarios: ${schedulesResponse.status}`);
          }
          
          const schedulesData = await schedulesResponse.json();
          console.log('Datos de horarios:', schedulesData);
          
          // Verificar que schedulesData sea un array
          const schedules = Array.isArray(schedulesData) ? schedulesData : [];
          
          setTherapist({
            ...therapistData,
            schedules: schedules
          });
          
          setLoading(false);
        } catch (err: any) {
          console.error('Error cargando datos:', err);
          setError(`Hubo un error al cargar los datos: ${err.message}`);
          setLoading(false);
          
          toast({
            title: "Error",
            description: `No se pudieron cargar los horarios: ${err.message}`,
            variant: "destructive",
          });
        }
      };
      
      getTherapistData();
    }
  }, [isOpen, therapistId, toast]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={therapist ? `Horarios de ${therapist.name}` : "Horarios del Fisioterapeuta"}
    >
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-700"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            {error}
          </div>
        ) : therapist ? (
          <>
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <User className="text-slate-700 mr-2" size={18} />
                <h3 className="font-medium">Fisioterapeuta: {therapist.name}</h3>
              </div>
              
              {therapist.services?.length > 0 ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-700 mb-1">Servicios que ofrece:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {therapist.services.map(service => (
                      <span 
                        key={service.id} 
                        className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full"
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-1">No hay servicios asignados</p>
              )}
            </div>

            <div className="mt-5">
              <div className="flex items-center mb-3">
                <Calendar className="text-slate-700 mr-2" size={18} />
                <h3 className="font-medium">Horarios disponibles</h3>
              </div>

              {therapist.schedules?.length > 0 ? (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-4 text-left rounded-tl-md">Día</th>
                        <th className="py-2 px-4 text-left">Horario</th>
                        <th className="py-2 px-4 text-left rounded-tr-md">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {therapist.schedules
                        .sort(sortDays)
                        .map(schedule => (
                          <tr key={schedule.id} className="border-t border-slate-200">
                            <td className="py-3 px-4">{translateDayOfWeek(schedule.dayOfWeek)}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <Clock size={14} className="mr-1 text-slate-500" />
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                schedule.isActive 
                                  ? 'bg-green-50 text-green-700' 
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {schedule.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-slate-500 italic">
                  Este fisioterapeuta no tiene horarios configurados.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <p className="text-center py-4 text-slate-500">No se encontró información del fisioterapeuta</p>
        )}
      </div>
    </Modal>
  );
}
