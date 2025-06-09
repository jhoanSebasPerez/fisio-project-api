'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarIcon, TrendingUpIcon, BarChartIcon, CalendarIcon } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'



interface SurveyAnalyticsProps {
  therapistId?: string
  className?: string
  showFilters?: boolean
}

interface SurveyAnalyticsData {
  dailyAverages: {
    date: string
    average: number
    count: number
  }[]
  ratingDistribution: number[]
  totalCount: number
  averageRating: number
}

interface TherapistInfo {
  id: string
  name: string
}

export function SurveyAnalyticsChart({ therapistId, className = '', showFilters = true }: SurveyAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SurveyAnalyticsData | null>(null)
  
  const [timeRange, setTimeRange] = useState('30') // días
  const [chartType, setChartType] = useState('trend') // 'trend' o 'distribution'
  const [selectedTherapist, setSelectedTherapist] = useState(therapistId || 'all')
  const [therapists, setTherapists] = useState<TherapistInfo[]>([])
  
  // Cargar lista de terapeutas si se necesitan filtros
  useEffect(() => {
    if (showFilters && !therapistId) {
      const fetchTherapists = async () => {
        try {
          const res = await fetch('/api/therapists')
          const data = await res.json()
          setTherapists(data)
        } catch (err) {
          console.error('Error cargando lista de terapeutas:', err)
        }
      }
      
      fetchTherapists()
    }
  }, [showFilters, therapistId])
  
  // Cargar datos de encuestas según filtros
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Construir URL con parámetros de consulta
        const params = new URLSearchParams()
        params.append('days', timeRange)
        
        if (selectedTherapist !== 'all') {
          params.append('therapistId', selectedTherapist)
        }
        
        const res = await fetch(`/api/reports/satisfaction/analytics?${params.toString()}`)
        
        if (!res.ok) {
          throw new Error(`Error al cargar datos: ${res.statusText}`)
        }
        
        const analyticsData = await res.json()
        setData(analyticsData)
      } catch (err: any) {
        console.error('Error cargando datos de analítica:', err)
        setError(err.message || 'Error al cargar datos de encuestas')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [timeRange, selectedTherapist])
  
  // Renderizar gráfico de tendencia utilizando HTML/CSS
  const renderTrendChart = () => {
    if (!data?.dailyAverages || data.dailyAverages.length === 0) return (
      <div className="text-center py-8 text-gray-500">
        No hay datos suficientes para mostrar la tendencia
      </div>
    )
    
    // Encontrar el valor máximo para escalar adecuadamente
    const maxCount = Math.max(...data.dailyAverages.map(d => d.count))
    
    return (
      <div className="space-y-2 pt-4">
        {data.dailyAverages.map((item, index) => {
          const formattedDate = format(new Date(item.date), 'dd MMM', { locale: es })
          const ratingPercentage = (item.average / 5) * 100
          
          return (
            <div key={item.date} className="flex items-center gap-2 text-sm">
              <div className="w-16 text-gray-600">{formattedDate}</div>
              <div className="flex-grow">
                <div className="h-5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${ratingPercentage}%` }}
                  />
                </div>
              </div>
              <div className="w-24 flex items-center gap-1">
                <span className="font-medium">{item.average.toFixed(1)}</span>
                <StarIcon className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-gray-500">({item.count})</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  
  // Renderizar gráfico de distribución utilizando HTML/CSS
  const renderDistributionChart = () => {
    if (!data?.ratingDistribution) return null
    
    const ratings = [1, 2, 3, 4, 5]
    const distribution = data.ratingDistribution.slice(1) // Ignoramos el índice 0
    const maxCount = Math.max(...distribution)
    
    // Colores para cada calificación
    const colors = [
      'bg-red-500',      // 1 estrella
      'bg-orange-500',   // 2 estrellas
      'bg-yellow-500',   // 3 estrellas
      'bg-green-500',    // 4 estrellas
      'bg-primary',      // 5 estrellas
    ]
    
    return (
      <div className="space-y-3 pt-4">
        {ratings.map((rating, index) => {
          const count = distribution[index]
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
          
          return (
            <div key={rating} className="flex items-center gap-3">
              <div className="w-16 flex items-center">
                <span className="font-medium">{rating}</span>
                <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400 ml-1" />
              </div>
              <div className="flex-grow">
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${colors[index]} rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-10 text-right font-medium">
                {count}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
  
  const renderSummary = () => {
    if (!data) return null
    
    const getRatingText = (rating: number) => {
      if (rating >= 4.5) return 'Excelente'
      if (rating >= 4.0) return 'Muy bueno'
      if (rating >= 3.5) return 'Bueno'
      if (rating >= 3.0) return 'Regular'
      return 'Necesita mejorar'
    }
    
    const summaryColor = () => {
      const rating = data.averageRating
      if (rating >= 4.5) return 'text-green-600'
      if (rating >= 4.0) return 'text-emerald-600'
      if (rating >= 3.5) return 'text-blue-600' 
      if (rating >= 3.0) return 'text-amber-600'
      return 'text-red-600'
    }
    
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-gray-500 text-sm mb-1">Promedio general</div>
          <div className={`text-3xl font-bold ${summaryColor()}`}>
            {data.averageRating.toFixed(1)}
            <span className="text-lg ml-1">/ 5</span>
          </div>
          <div className="text-sm mt-1">{getRatingText(data.averageRating)}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-gray-500 text-sm mb-1">Total de encuestas</div>
          <div className="text-3xl font-bold text-blue-600">
            {data.totalCount}
          </div>
          <div className="text-sm mt-1">respuestas</div>
        </div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-7 w-[250px] mb-1" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent className="min-h-[300px]">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-700">Error al cargar analítica</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }
  
  if (!data || data.totalCount === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Análisis de encuestas</CardTitle>
          <CardDescription>
            No hay datos de encuestas suficientes para mostrar analíticas
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center min-h-[200px] flex items-center justify-center">
          <div className="text-gray-400">
            <StarIcon className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p>No hay encuestas registradas en el periodo seleccionado</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle>Análisis de encuestas</CardTitle>
            <CardDescription>
              Evolución y distribución de satisfacción
            </CardDescription>
          </div>
          
          {showFilters && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {!therapistId && (
                <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Todos los terapeutas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los terapeutas</SelectItem>
                    {therapists.map(therapist => (
                      <SelectItem key={therapist.id} value={therapist.id}>
                        {therapist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Último mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Última semana</SelectItem>
                  <SelectItem value="30">Último mes</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {renderSummary()}
        
        <div className="mt-4 mb-2">
          <Tabs value={chartType} onValueChange={setChartType} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="trend" className="flex-1">
                <TrendingUpIcon className="h-4 w-4 mr-1" />
                Tendencia
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex-1">
                <StarIcon className="h-4 w-4 mr-1" />
                Distribución
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trend" className="mt-4">
              <div className="min-h-[250px]">
                {renderTrendChart()}
              </div>
            </TabsContent>
            
            <TabsContent value="distribution" className="mt-4">
              <div className="min-h-[250px]">
                {renderDistributionChart()}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
