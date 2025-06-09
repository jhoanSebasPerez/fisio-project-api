'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { SurveyResponseView } from '@/components/surveys/SurveyResponseView'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserIcon, 
  PhoneIcon, 
  ClipboardIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  MessageCircleIcon,
  AlertCircleIcon
} from 'lucide-react'
import Loading from '@/components/loading'

// Definir interfaces para los datos
interface Appointment {
  id: string
  date: string
  duration: number
  status: string
  patientId: string
  therapistId: string
  service: string
  notes: string | null
  patient: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  therapist: {
    id: string
    name: string
    specialization: string | null
    email: string
  }
}

// Componente de la página de detalles de cita
export default function AppointmentDetailsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string
  
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('details')
  const [hasSurveyResponse, setHasSurveyResponse] = useState(false)
  
  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (sessionStatus === 'loading') return
      
      if (!session) {
        router.push('/login')
        return
      }
      
      try {
        setLoading(true)
        const response = await fetch(`/api/appointments/${appointmentId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Cita no encontrada')
          } else if (response.status === 403) {
            throw new Error('No tienes permiso para ver esta cita')
          } else {
            throw new Error('Error al cargar los detalles de la cita')
          }
        }
        
        const data = await response.json()
        setAppointment(data)
        
        // Verificar si hay una encuesta respondida
        if (data.status === 'COMPLETED') {
          const checkResponse = await fetch(`/api/survey/${appointmentId}/check`)
          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            setHasSurveyResponse(checkData.exists)
          }
        }
      } catch (err: any) {
        console.error('Error obteniendo detalles de la cita:', err)
        setError(err.message || 'Error al cargar los detalles')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAppointmentDetails()
  }, [appointmentId, router, session, sessionStatus])
  
  // Función para renderizar el estado de la cita con colores
  const renderStatus = (status: string) => {
    const statusMap: Record<string, { color: string, label: string }> = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', label: 'Pendiente' },
      'CONFIRMED': { color: 'bg-blue-100 text-blue-800', label: 'Confirmada' },
      'COMPLETED': { color: 'bg-green-100 text-green-800', label: 'Completada' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
      'RESCHEDULED': { color: 'bg-purple-100 text-purple-800', label: 'Reprogramada' },
    }
    
    const { color, label } = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    
    return (
      <Badge variant="outline" className={`${color} border-0`}>
        {label}
      </Badge>
    )
  }
  
  // Renderizar acciones disponibles según el estado de la cita
  const renderActions = () => {
    if (!appointment) return null
    
    const isAdmin = session?.user.role === 'ADMIN'
    const isTherapist = session?.user.role === 'THERAPIST' && session?.user.id === appointment.therapistId
    
    // No mostrar acciones si la cita está cancelada o ya completada
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return null
    }
    
    return (
      <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
        {/* Acción para completar cita */}
        {(isAdmin || isTherapist) && appointment.status === 'CONFIRMED' && (
          <Button 
            className="flex items-center gap-2"
            onClick={() => {
              if (window.confirm('¿Marcar esta cita como completada?')) {
                // Implementar lógica para completar cita
                console.log('Completando cita')
              }
            }}
          >
            <CheckCircleIcon className="h-4 w-4" />
            Completar
          </Button>
        )}
        
        {/* Acción para cancelar cita */}
        {(isAdmin || isTherapist || session?.user.id === appointment.patientId) && 
          appointment.status !== 'CANCELLED' && (
          <Button 
            variant="destructive"
            className="flex items-center gap-2"
            onClick={() => {
              if (window.confirm('¿Estás seguro de cancelar esta cita?')) {
                // Implementar lógica para cancelar cita
                console.log('Cancelando cita')
              }
            }}
          >
            <XCircleIcon className="h-4 w-4" />
            Cancelar
          </Button>
        )}
        
        {/* Acción para editar cita */}
        {(isAdmin || isTherapist) && appointment.status !== 'COMPLETED' && (
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push(`/appointments/${appointmentId}/edit`)}
          >
            <PencilIcon className="h-4 w-4" />
            Editar
          </Button>
        )}
        
        {/* Acción para reprogramar cita */}
        {(isAdmin || isTherapist) && appointment.status !== 'COMPLETED' && (
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push(`/appointments/${appointmentId}/reschedule`)}
          >
            <CalendarIcon className="h-4 w-4" />
            Reprogramar
          </Button>
        )}
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <Loading />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg flex flex-col items-center text-center">
          <AlertCircleIcon className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      </div>
    )
  }
  
  if (!appointment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg flex flex-col items-center text-center">
          <AlertCircleIcon className="h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold text-yellow-700 mb-2">Cita no encontrada</h1>
          <p className="text-yellow-600 mb-4">No se encontró información para esta cita.</p>
          <Button variant="outline" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.back()}
        >
          &larr; Volver
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">
          Detalles de la cita
          <span className="ml-3">{renderStatus(appointment.status)}</span>
        </h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          {appointment.status === 'COMPLETED' && (
            <TabsTrigger value="survey">
              Encuesta
              {hasSurveyResponse && activeTab !== 'survey' && (
                <span className="relative flex h-2 w-2 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Información de la cita</CardTitle>
                <CardDescription>
                  Detalles sobre la fecha, hora y servicio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Fecha y hora</p>
                    <p className="text-muted-foreground">
                      {format(
                        new Date(appointment.date),
                        "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm",
                        { locale: es }
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Duración</p>
                    <p className="text-muted-foreground">{appointment.duration} minutos</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <ClipboardIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Servicio</p>
                    <p className="text-muted-foreground">{appointment.service}</p>
                  </div>
                </div>
                
                {appointment.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-medium mb-2">Notas</p>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      {appointment.notes}
                    </div>
                  </div>
                )}
                
                {renderActions()}
              </CardContent>
            </Card>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paciente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.patient.name}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {appointment.patient.email && (
                      <p className="flex items-center gap-2">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{appointment.patient.email}</span>
                      </p>
                    )}
                    
                    {appointment.patient.phone && (
                      <p className="flex items-center gap-2">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <span>{appointment.patient.phone}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Terapeuta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.therapist.name}</p>
                      {appointment.therapist.specialization && (
                        <p className="text-sm text-muted-foreground">
                          {appointment.therapist.specialization}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{appointment.therapist.email}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="survey">
          <Card>
            <CardHeader>
              <CardTitle>Encuesta de satisfacción</CardTitle>
              <CardDescription>
                Resultados de la encuesta de satisfacción para esta cita
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SurveyResponseView appointmentId={appointmentId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
