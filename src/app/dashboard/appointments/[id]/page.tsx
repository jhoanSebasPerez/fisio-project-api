'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { SurveyResponseView } from '@/components/surveys/SurveyResponseView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  PenLine,
  X,
  Loader,
  XCircle
} from 'lucide-react';

interface AppointmentService {
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
  };
  serviceId: string;
}

interface TherapistNote {
  id: string;
  content: string;
  createdAt: string;
  therapist?: {
    name: string;
    email: string;
  };
}

interface AppointmentDetails {
  id: string;
  patientId: string;
  date: string;
  status: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  services: Array<{
    name: string;
    description: string;
    duration: number;
    price: number;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    therapistName: string;
  }>;
  therapistId?: string;
  therapistName?: string;
  therapistEmail?: string;
  therapistPhone?: string;
}

interface AppointmentPageProps {
  params: {
    id: string;
  };
}

export default function AppointmentDetailsPage({ params }: AppointmentPageProps) {
  const { id } = params;
  const router = useRouter();
  const { data: session, status } = useSession();

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSurveyResponse, setHasSurveyResponse] = useState<boolean>(false);
  const [noteContent, setNoteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Estado para historial del paciente
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Comprobar si el usuario tiene permisos suficientes (terapeuta o administrador)
    if (session?.user.role !== 'THERAPIST' && session?.user.role !== 'ADMIN') {
      setSaveError('Solo los terapeutas y administradores pueden acceder a esta página');
      setLoading(false);
      return;
    }

    const fetchAppointmentDetails = async () => {
      try {
        const response = await fetch(`/api/appointments/${id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });

        if (!response.ok) {
          throw new Error(`Error al cargar los detalles de la cita: ${response.status}`);
        }

        const data = await response.json();
        console.log('Respuesta de la API:', data);
        console.log('AppointmentServices:', data.appointmentServices);
        console.log('Patient:', data.patient);
        console.log('Therapist:', data.therapist);
        console.log('TherapistNotes:', data.therapistNotes);

        // Mostrar toda la estructura de los datos para depurar
        console.log('Estructura completa de los datos:', JSON.stringify(data, null, 2));
        
        // Verificar si hay una encuesta respondida para esta cita
        if (data.status === 'COMPLETED') {
          const checkResponse = await fetch(`/api/survey/${id}/check`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            setHasSurveyResponse(checkData.exists);
          }
        }

        // Procesar los datos para asegurar que tenemos la estructura correcta
        const appointmentDetails: AppointmentDetails = {
          id: data.id,
          patientId: data.patientId,
          date: data.date,
          status: data.status,
          patientName: data.patient?.name || 'Paciente sin nombre',
          patientEmail: data.patient?.email || 'No disponible',
          patientPhone: data.patient?.phone || undefined,
          therapistId: data.therapistId,
          therapistName: data.therapist?.name || undefined,
          therapistEmail: data.therapist?.email || undefined,
          therapistPhone: data.therapist?.phone || undefined,
          services: Array.isArray(data.appointmentServices)
            ? data.appointmentServices.map((as: any) => ({
              id: as.service?.id || as.serviceId || 'unknown-id',
              name: as.service?.name || 'Servicio sin nombre',
              description: as.service?.description || 'Sin descripción disponible',
              price: typeof as.service?.price === 'number' ? as.service.price : 0,
              duration: typeof as.service?.duration === 'number' ? as.service.duration : 0
            }))
            : [],
          notes: Array.isArray(data.therapistNotes)
            ? data.therapistNotes.map((note: any) => ({
              id: note.id || 'unknown-id',
              content: note.content || '',
              createdAt: note.createdAt || new Date().toISOString(),
              therapistName: note.therapist?.name || 'Terapeuta'
            }))
            : []
        };

        console.log('Datos formateados:', appointmentDetails);
        setAppointment(appointmentDetails);
      } catch (err) {
        console.error('Error al cargar los detalles de la cita:', err);
        setSaveError(`Error al cargar los detalles: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
    console.log('Intentando cargar detalles de cita con ID:', id);
  }, [id, router, session, status]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    try {
      setSubmitting(true);
      setSaveError(null);

      const response = await fetch(`/api/appointments/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: noteContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la nota');
      }

      const newNote = await response.json();

      // Actualizar el estado local con la nueva nota
      if (appointment) {
        setAppointment({
          ...appointment,
          notes: [
            ...appointment.notes,
            {
              id: newNote.id,
              content: newNote.content,
              createdAt: newNote.createdAt,
              therapistName: session?.user?.name || 'Terapeuta'
            }
          ]
        });
      }

      // Limpiar el formulario
      setNoteContent('');
    } catch (err) {
      console.error('Error al guardar la nota:', err);
      setSaveError(`Error al guardar: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="secondary">Programada</Badge>;
      case 'CONFIRMED':
        return <Badge variant="default">Confirmada</Badge>;
      case 'RESCHEDULED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Reprogramada</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAppointmentTime = (dateString: string) => {
    const appointmentDate = new Date(dateString);
    return format(appointmentDate, 'HH:mm');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd MMMM yyyy', { locale: es });
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Función para marcar la cita como completada
  // Función para cargar el historial completo del paciente
  const loadPatientHistory = async () => {
    if (!appointment?.patientId) {
      setHistoryError('No se puede cargar el historial: ID de paciente no disponible');
      return;
    }

    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/patients/${appointment.patientId}/history?_=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar el historial: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Historial del paciente cargado:', data);
      setPatientHistory(data);
    } catch (error) {
      console.error('Error al cargar el historial del paciente:', error);
      setHistoryError(error instanceof Error ? error.message : 'Error al cargar el historial del paciente');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCompleteAppointment = async () => {
    try {
      setIsUpdating(true);
      setUpdateMessage(null);

      // Llamamos al endpoint específico para completar citas que también envía la encuesta
      const response = await fetch(`/api/appointments/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error al completar la cita: ${response.status}`);
      }

      const updatedData = await response.json();
      console.log('Cita completada:', updatedData);

      // Actualizar el estado local con los datos recibidos
      if (appointment) {
        setAppointment({
          ...appointment,
          status: 'COMPLETED'
        });
        setUpdateMessage({
          type: 'success',
          text: 'La cita ha sido marcada como completada y se ha enviado una encuesta de satisfacción al paciente'
        });
      }
    } catch (err) {
      console.error('Error al completar la cita:', err);
      setUpdateMessage({ type: 'error', text: `Error al completar la cita: ${(err as Error).message}` });
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (saveError && !appointment) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white shadow-sm rounded-lg border">
        <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-md">
          <h2 className="text-lg font-medium mb-2">Error</h2>
          <p>{saveError}</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-amber-600 flex items-center gap-3">
          <AlertCircle size={20} />
          <p>No se encontró la información de la cita</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Detalles de la Cita</h1>
          <p className="text-gray-500">ID: {appointment.id.substring(0, 8)}...</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(appointment.status)}
          {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCompleteAppointment}
              disabled={isUpdating}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {isUpdating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Marcar como completada
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mensaje de actualización */}
      {updateMessage && (
        <div className={`mb-6 p-4 rounded-md flex items-center gap-2 ${updateMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {updateMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <p>{updateMessage.text}</p>
          <Button variant="ghost" size="sm" className="ml-auto p-1 h-auto" onClick={() => setUpdateMessage(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Tarjeta con información general */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Fecha:</span>
                </div>
                <span className="text-sm">{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Hora:</span>
                </div>
                <span className="text-sm">{formatAppointmentTime(appointment.date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Estado:</span>
                </div>
                <span>{getStatusBadge(appointment.status)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Identificador:</span>
                </div>
                <span className="text-xs text-gray-500">{appointment.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta con datos del paciente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Nombre:</span>
                </div>
                <span className="text-sm">{appointment.patientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Email:</span>
                </div>
                <span className="text-sm">{appointment.patientEmail}</span>
              </div>
              {appointment.patientPhone && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Teléfono:</span>
                  </div>
                  <span className="text-sm">{appointment.patientPhone}</span>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">ID Paciente: {appointment.id.substring(0, 8)}...</div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Mostrar servicios detallados como una sección completa */}
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3">Servicios incluidos</h2>
        <div className="space-y-3">
          {appointment.services && appointment.services.length > 0 ? (
            appointment.services.map((service, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                  <h3 className="font-medium">{service.name}</h3>
                  <Badge variant="outline" className="font-normal">
                    {service.duration} min
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-700">{service.description}</p>
                  <div className="flex justify-end mt-2">
                    <span className="text-sm font-medium text-gray-700">Precio: ${service.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-4 border rounded-md bg-gray-50 text-gray-500">
              No hay servicios asociados a esta cita
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="notes">Notas del Terapeuta</TabsTrigger>
          <TabsTrigger value="history">Historial del Paciente</TabsTrigger>
          <TabsTrigger value="therapist">Información del Terapeuta</TabsTrigger>
          {appointment.status === 'COMPLETED' && hasSurveyResponse && (
            <TabsTrigger value="survey">Encuesta de Satisfacción</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notas de Tratamiento</CardTitle>
              <CardDescription>
                Registre información sobre el tratamiento, síntomas y progreso del paciente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointment.notes && appointment.notes.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {appointment.notes.map((note) => (
                    <div key={note.id} className="border rounded-md p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                          <PenLine size={14} />
                          <span>
                            {note.therapistName}, {format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-gray-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border rounded-md bg-gray-50">
                  <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p>No hay notas registradas para esta cita</p>
                </div>
              )}

              {appointment.status !== 'CANCELLED' && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Agregar nueva nota</h3>
                  <Textarea
                    placeholder="Escriba una nota sobre el tratamiento realizado, observaciones o seguimiento..."
                    className="min-h-[120px]"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />

                  {saveError && (
                    <div className="mt-2 text-sm text-red-600">
                      {saveError}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleAddNote}
                      disabled={submitting || !noteContent.trim()}
                    >
                      {submitting ? 'Guardando...' : 'Guardar Nota'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-lg">Historial del Paciente</CardTitle>
                <CardDescription>Historial completo de atenciones previas</CardDescription>
              </div>
              {!patientHistory && !loadingHistory && !historyError && appointment?.patientEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPatientHistory()}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Cargar historial
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : historyError ? (
                <div className="p-4 bg-red-50 text-red-600 rounded-md">
                  <p>{historyError}</p>
                </div>
              ) : patientHistory ? (
                <div className="space-y-6">
                  {/* Información general */}
                  <div className="bg-blue-50 rounded-md p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Datos generales del paciente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500">Nombre completo:</p>
                        <p className="font-medium">{patientHistory.patient.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email:</p>
                        <p>{patientHistory.patient.email}</p>
                      </div>
                      {patientHistory.patient.phone && (
                        <div>
                          <p className="text-sm text-gray-500">Teléfono:</p>
                          <p>{patientHistory.patient.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Paciente desde:</p>
                        <p>{new Date(patientHistory.patient.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div>
                    <h3 className="font-medium mb-3">Estadísticas del paciente</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-green-50 p-4 rounded-md">
                        <p className="text-green-600 text-sm">Total de citas completadas</p>
                        <p className="text-2xl font-bold text-green-800">
                          {patientHistory.statistics.totalAppointments}
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-md">
                        <p className="text-purple-600 text-sm">Primera visita</p>
                        <p className="text-md font-medium text-purple-800">
                          {patientHistory.statistics.firstVisit ?
                            new Date(patientHistory.statistics.firstVisit).toLocaleDateString() :
                            'N/A'}
                        </p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-md">
                        <p className="text-amber-600 text-sm">Última visita</p>
                        <p className="text-md font-medium text-amber-800">
                          {patientHistory.statistics.lastVisit ?
                            new Date(patientHistory.statistics.lastVisit).toLocaleDateString() :
                            'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Servicios recibidos */}
                  <div>
                    <h3 className="font-medium mb-3">Servicios recibidos previamente</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(patientHistory.statistics.servicesReceived).map(([service, count]) => (
                        <div key={service} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                          <span>{service}</span>
                          <Badge variant="secondary" className="text-xs">{String(count)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Historial de citas y notas */}
                  <div>
                    <h3 className="font-medium mb-3">Historial de citas y notas</h3>
                    {patientHistory.appointments.length > 0 ? (
                      <div className="space-y-4">
                        {patientHistory.appointments.map((app: any) => (
                          <Card key={app.id} className="overflow-hidden">
                            <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  {new Date(app.date).toLocaleDateString()} - {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Terapeuta: {app.therapist?.name || 'No asignado'}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {app.status}
                              </Badge>
                            </div>
                            <CardContent className="p-3">
                              {/* Servicios de la cita */}
                              <div className="mb-3">
                                <p className="text-sm text-gray-500 mb-1">Servicios recibidos:</p>
                                <div className="flex flex-wrap gap-1">
                                  {app.appointmentServices.map((as: any, index: number) => (
                                    <Badge key={as.id || `service-${index}`} variant="secondary" className="font-normal">
                                      {as.service?.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Notas de la cita */}
                              {app.therapistNotes.length > 0 && (
                                <div>
                                  <p className="text-sm text-gray-500 mb-1">Notas del terapeuta:</p>
                                  <div className="space-y-2">
                                    {app.therapistNotes.map((note: any) => (
                                      <div key={note.id} className="bg-blue-50 p-2 rounded-md">
                                        <p className="text-sm">{note.content}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Por {note.therapist?.name} - {new Date(note.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-gray-50 rounded-md">
                        <p className="text-gray-500">No hay citas anteriores para este paciente</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-10">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">Aún no se ha cargado el historial del paciente</p>
                  <p className="text-sm text-gray-400">Haga clic en el botón "Cargar historial" para ver la información completa del paciente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="therapist">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Terapeuta</CardTitle>
            </CardHeader>
            <CardContent>
              {appointment.therapistName ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border-b">
                    <div className="font-medium">Nombre</div>
                    <div>{appointment.therapistName}</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border-b">
                    <div className="font-medium">Email</div>
                    <div>{appointment.therapistEmail}</div>
                  </div>
                  {appointment.therapistPhone && (
                    <div className="flex items-center justify-between p-2 border-b">
                      <div className="font-medium">Teléfono</div>
                      <div>{appointment.therapistPhone}</div>
                    </div>
                  )}
                  <div className="mt-4 p-4 bg-gray-50 border rounded-md">
                    <h3 className="font-medium mb-2">Información para el paciente</h3>
                    <p className="text-sm text-gray-600">
                      Este profesional está asignado para atender la cita programada.
                      Si necesita reprogramar o tiene preguntas, puede contactarles directamente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  <User className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No hay información disponible sobre el terapeuta asignado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {appointment.status === 'COMPLETED' && hasSurveyResponse && (
          <TabsContent value="survey">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados de la Encuesta de Satisfacción</CardTitle>
                <CardDescription>
                  Respuestas del paciente sobre su experiencia con el servicio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SurveyResponseView appointmentId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
