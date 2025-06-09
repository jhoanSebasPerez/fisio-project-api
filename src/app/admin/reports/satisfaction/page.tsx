'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, StarIcon, DownloadIcon } from 'lucide-react'
import NotFound from '@/components/not-found'
import AccessDenied from '@/components/access-denied'
import Loading from '@/components/loading'
import { SurveyNavigation } from '@/components/surveys/SurveyNavigation'
import { SurveyAnalyticsChart } from '@/components/surveys/SurveyAnalyticsChart'

interface SatisfactionReport {
  startDate: string
  endDate: string
  surveysCount: number
  overall: {
    average: number
    distribution: number[]
  }
  therapists: {
    id: string
    name: string
    completedAppointments: number
    surveyedAppointments: number
    surveyRate: number
    satisfactionRate: number
  }[]
  trend: {
    month: string
    average: number
    count: number
  }[]
}

export default function SatisfactionReportPage() {
  const { data: session, status } = useSession()
  const [report, setReport] = useState<SatisfactionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fechas para el filtro
  const [startDate, setStartDate] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() - 3, 1)
  })
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  // Filtro de terapeuta
  const [selectedTherapistId, setSelectedTherapistId] = useState<string | null>(null)
  
  // Cargar datos
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'ADMIN') {
      setLoading(false)
      return
    }
    
    const fetchReport = async () => {
      setLoading(true)
      try {
        const queryParams = new URLSearchParams()
        queryParams.append('startDate', startDate.toISOString())
        queryParams.append('endDate', endDate.toISOString())
        
        if (selectedTherapistId) {
          queryParams.append('therapistId', selectedTherapistId)
        }
        
        const response = await fetch(`/api/reports/satisfaction?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Error al cargar reporte: ${response.statusText}`)
        }
        
        const data = await response.json()
        setReport(data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar el reporte de satisfacción')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchReport()
  }, [session, status, startDate, endDate, selectedTherapistId])
  
  if (status === 'loading') {
    return <Loading message="Cargando..." />
  }
  
  if (!session) {
    return <AccessDenied message="Debe iniciar sesión para ver esta página" />
  }
  
  if (session.user.role !== 'ADMIN') {
    return <AccessDenied message="Acceso restringido a administradores" />
  }
  
  const handleDateChange = (type: 'start' | 'end', date?: Date) => {
    if (!date) return
    
    if (type === 'start') {
      setStartDate(date)
    } else {
      setEndDate(date)
    }
  }
  
  const clearTherapistFilter = () => {
    setSelectedTherapistId(null)
  }
  
  // Renderizar estrellas según calificación
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <StarIcon 
        key={i} 
        className={`h-4 w-4 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
      />
    ))
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
        <h1 className="text-2xl font-bold">Reportes de satisfacción</h1>
        <SurveyNavigation activeItem="reports" />
      </div>
      
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-red-700">{error}</CardContent>
        </Card>
      )}
      
      <div className="mb-6">
        <SurveyAnalyticsChart 
          therapistId={selectedTherapistId || undefined} 
          className="mb-6"
          showFilters={true}
        />
      </div>
      
      <div className="mb-6 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(startDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => handleDateChange('start', date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          
          <span className="mt-2">a</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(endDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => handleDateChange('end', date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          
          {selectedTherapistId && (
            <Button 
              variant="ghost"
              onClick={clearTherapistFilter}
              className="gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Todos los terapeutas
            </Button>
          )}
        </div>
        
        <Button 
          variant="outline"
          onClick={() => {
            const params = new URLSearchParams()
            params.append('startDate', startDate.toISOString())
            params.append('endDate', endDate.toISOString())
            if (selectedTherapistId) {
              params.append('therapistId', selectedTherapistId)
            }
            window.open(`/api/reports/satisfaction/export?${params.toString()}`, '_blank')
          }}
          disabled={loading || !report}
          className="flex items-center gap-2"
        >
          <DownloadIcon className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>
      
      {/* Contenido principal */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full md:col-span-2" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      ) : !report || report.surveysCount === 0 ? (
        <NotFound 
          message="No se encontraron encuestas para el período seleccionado"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Resumen general */}
            <Card>
              <CardHeader>
                <CardTitle>Satisfacción general</CardTitle>
                <CardDescription>
                  Basado en {report.surveysCount} encuestas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-3xl font-bold">
                    {report.overall.average.toFixed(1)}
                  </div>
                  <div className="flex">
                    {renderStars(report.overall.average)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {report.overall.distribution.map((percentage, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-8 text-sm">{5 - idx} ★</div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-10 text-sm text-right">{percentage}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Tendencia de satisfacción */}
            <Card>
              <CardHeader>
                <CardTitle>Evolución temporal</CardTitle>
                <CardDescription>
                  Tendencia de satisfacción por mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.trend.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay datos de tendencia disponibles</p>
                ) : (
                  <div className="space-y-4">
                    {report.trend.map((item) => (
                      <div key={item.month} className="flex items-center gap-4">
                        <div className="w-20">
                          {item.month}
                        </div>
                        <div className="flex-grow">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(item.average / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 min-w-[5rem]">
                          <span className="text-sm font-medium">
                            {item.average.toFixed(1)}
                          </span>
                          <StarIcon className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-gray-500">
                            ({item.count})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Satisfacción por terapeuta */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Satisfacción por terapeuta</CardTitle>
              <CardDescription>
                Comparativa entre profesionales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] overflow-hidden">
                  <thead>
                    <tr className="text-left text-sm border-b">
                      <th className="pb-2">Terapeuta</th>
                      <th className="pb-2">Citas completadas</th>
                      <th className="pb-2">Citas evaluadas</th>
                      <th className="pb-2">Tasa de encuesta</th>
                      <th className="pb-2">Satisfacción</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.therapists.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/50">
                        <td className="py-3">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto"
                            onClick={() => setSelectedTherapistId(
                              selectedTherapistId === t.id ? null : t.id
                            )}
                          >
                            {t.name}
                          </Button>
                        </td>
                        <td className="py-3">{t.completedAppointments}</td>
                        <td className="py-3">{t.surveyedAppointments}</td>
                        <td className="py-3">{t.surveyRate}%</td>
                        <td className="py-3 flex items-center gap-1">
                          <span>{t.satisfactionRate.toFixed(1)}</span>
                          <div className="flex">
                            {renderStars(t.satisfactionRate)}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          {selectedTherapistId !== t.id && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedTherapistId(t.id)}
                            >
                              Ver detalle
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
