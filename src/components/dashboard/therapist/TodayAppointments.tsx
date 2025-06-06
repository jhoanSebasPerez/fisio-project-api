'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, FileText, CheckCircle, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Appointment {
  id: string;
  date: string;
  status: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  services: string[];
}

interface TodayAppointmentsProps {
  date?: Date;
}

export function TodayAppointments({ date = new Date() }: TodayAppointmentsProps) {
  // Estados para manejar los datos y estados de UI
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Referencias para controlar el flujo de ejecución
  const requestMade = useRef(false);
  const fetchController = useRef<AbortController | null>(null);

  // Memorizar valores para evitar recálculos
  const dateString = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  // Efecto principal para cargar los datos
  useEffect(() => {
    console.log('Ejecutando efecto principal con fecha:', dateString);

    // Reiniciar el flag cada vez que el componente se monta
    requestMade.current = false;

    const loadAppointments = async () => {
      // Evitar peticiones duplicadas dentro del mismo ciclo de vida del componente
      if (requestMade.current) {
        console.log('Ya se realizó una petición en este montaje, abortando');
        return;
      }

      setLoading(true);
      setError(null);
      requestMade.current = true;

      // Si no hay caché o está expirado, hacer petición al API
      try {
        // Crear nuevo controlador para esta petición
        if (fetchController.current) {
          fetchController.current.abort();
        }

        fetchController.current = new AbortController();

        // Construir la URL con la fecha como parámetro
        const apiUrl = `/api/dashboard/therapist-appointments?date=${encodeURIComponent(dateString)}`;
        console.log(`Realizando petición a: ${apiUrl}`);

        // Uso de timestamp para evitar caché de cualquier tipo
        const cacheBuster = `&_=${Date.now()}`;
        const urlWithCacheBuster = `${apiUrl}${cacheBuster}`;

        const response = await fetch(urlWithCacheBuster, {
          signal: fetchController.current.signal,
          method: 'GET',
          headers: {
            // Headers para forzar datos frescos
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            // Timestamp como header adicional
            'X-Timestamp': Date.now().toString()
          }
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
          throw new Error('Respuesta de API inválida: no se recibió un objeto JSON');
        }

        // Verificar si la respuesta contiene el campo appointments
        if (!data.appointments) {
          console.warn('La respuesta no contiene el campo "appointments":', data);
          throw new Error('Formato de respuesta inválido: falta el campo "appointments"');
        }

        // Verificar y procesar los datos de citas
        const appointmentData = Array.isArray(data.appointments) ? data.appointments : [];
        console.log(`Citas obtenidas: ${appointmentData.length}`);

        // Actualizar el estado con los datos obtenidos
        setAppointments(appointmentData);

      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error al obtener citas:', err);
          setError(`Error al cargar citas: ${(err as Error).message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    // Ejecutar la carga de citas
    loadAppointments();

    // Limpieza al desmontar
    return () => {
      if (fetchController.current) {
        fetchController.current.abort();
      }
    };
  }, [dateString]); // Solo re-ejecutar si cambia la fecha

  const formatAppointmentTime = (dateString: string) => {
    const appointmentDate = new Date(dateString);
    return format(appointmentDate, 'HH:mm', { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge className="bg-blue-500">Programada</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-green-500">Confirmada</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-500">Completada</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Debug para verificar el estado actual cuando cambian appointments
  useEffect(() => {
    console.log('Cambio en appointments:', appointments.length, appointments);
  }, [appointments]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Citas para Hoy</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar size={14} />
            {format(date, 'd MMMM yyyy', { locale: es })}
          </Badge>
        </div>
        <CardDescription>Lista de citas programadas para el día de hoy</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : !appointments || appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No hay citas programadas para hoy</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Citas para hoy: <span className="text-primary">{appointments.length}</span></h3>
              <Badge variant="outline" className="px-2 py-1">
                {format(new Date(), 'EEEE', { locale: es })}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {appointments
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((appointment) => {
                  const appointmentTime = new Date(appointment.date);
                  const isUpcoming = appointmentTime > new Date();
                  const isPast = new Date() > new Date(appointmentTime.getTime() + 60 * 60 * 1000); // 1 hora después

                  return (
                    <div
                      key={appointment.id}
                      className={`border rounded-lg overflow-hidden transition-all hover:shadow-md 
                        ${isUpcoming ? 'bg-blue-50/40 border-blue-100' : ''}
                        ${isPast && appointment.status !== 'COMPLETED' ? 'bg-amber-50/40 border-amber-100' : ''}
                        ${appointment.status === 'COMPLETED' ? 'bg-green-50/40 border-green-100' : ''}
                        ${appointment.status === 'CANCELLED' ? 'bg-gray-50 border-gray-100' : ''}
                      `}
                    >
                      {/* Cabecera de la cita con hora y estado */}
                      <div className="px-4 py-3 bg-white border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-primary/10">
                            <Clock size={18} className="text-primary" />
                          </div>
                          <div className="font-semibold text-lg">
                            {formatAppointmentTime(appointment.date)}
                          </div>
                          {isPast && appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                            <Badge variant="outline" className="text-xs font-normal border-amber-300 text-amber-700 bg-amber-50">Atrasada</Badge>
                          )}
                        </div>
                        <div>
                          {getStatusBadge(appointment.status)}
                        </div>
                      </div>

                      {/* Contenido principal */}
                      <div className="p-4">
                        {/* Servicios */}
                        <div className="mb-3">
                          <h4 className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Servicios</h4>
                          <div className="flex flex-wrap gap-1">
                            {appointment.services.map((service, i) => (
                              <Badge key={i} variant="secondary" className="font-normal text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Información del paciente */}
                        <div className="mb-4">
                          <h4 className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Paciente</h4>
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{appointment.patientName}</p>
                              <p className="text-xs text-gray-500">{appointment.patientEmail}</p>
                              {appointment.patientPhone && (
                                <p className="text-xs text-gray-500">{appointment.patientPhone}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                          <Link href={`/dashboard/appointments/${appointment.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1 h-8">
                              <FileText size={14} />
                              <span>Detalles</span>
                            </Button>
                          </Link>
                          {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
                            <Link href={`/dashboard/appointments/${appointment.id}`}>
                              <Button size="sm" className="flex items-center gap-1 h-8 bg-primary hover:bg-primary/90">
                                <PenLine size={14} />
                                <span>Agregar notas</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
