'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StarIcon, CalendarIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SurveyResponseView } from '@/components/surveys/SurveyResponseView'
import AccessDenied from '@/components/access-denied'
import Loading from '@/components/loading'

interface Survey {
  id: string
  satisfaction: number
  comments: string | null
  createdAt: string
  appointmentId: string
  appointment: {
    id: string
    date: string
    patient: {
      id: string
      name: string
    }
    therapist: {
      id: string
      name: string
    }
  }
}

export default function SurveysAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(10)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [minRating, setMinRating] = useState('')
  
  useEffect(() => {
    // Recuperar parámetros de URL
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const rating = searchParams.get('rating') || ''
    
    setCurrentPage(page)
    setSearchTerm(search)
    setSortField(sort)
    setSortOrder(order)
    setMinRating(rating)
  }, [searchParams])
  
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || session.user.role !== 'ADMIN') {
      setLoading(false)
      return
    }
    
    const fetchSurveys = async () => {
      setLoading(true)
      try {
        // Construir los parámetros de consulta
        const queryParams = new URLSearchParams()
        queryParams.append('page', currentPage.toString())
        queryParams.append('pageSize', pageSize.toString())
        
        if (searchTerm) queryParams.append('search', searchTerm)
        if (sortField) queryParams.append('sortField', sortField)
        if (sortOrder) queryParams.append('sortOrder', sortOrder)
        if (minRating) queryParams.append('minRating', minRating)
        
        const response = await fetch(`/api/admin/surveys?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Error al cargar las encuestas: ${response.statusText}`)
        }
        
        const data = await response.json()
        setSurveys(data.surveys)
        setTotalPages(Math.ceil(data.total / pageSize))
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error al cargar las encuestas')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSurveys()
  }, [session, status, currentPage, pageSize, searchTerm, sortField, sortOrder, minRating])
  
  const updateFilters = () => {
    const params = new URLSearchParams()
    params.append('page', '1') // Reset to page 1 when filters change
    if (searchTerm) params.append('search', searchTerm)
    params.append('sort', sortField)
    params.append('order', sortOrder)
    if (minRating) params.append('rating', minRating)
    
    router.push(`/admin/surveys?${params.toString()}`)
  }
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    
    // Convertir ReadonlyURLSearchParams a objeto para evitar el error de tipo
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });
    
    const params = new URLSearchParams(paramsObj)
    params.set('page', newPage.toString())
    router.push(`/admin/surveys?${params.toString()}`)
  }
  
  if (status === 'loading') {
    return <Loading message="Cargando..." />
  }
  
  if (!session) {
    return <AccessDenied message="Debe iniciar sesión para ver esta página" />
  }
  
  if (session.user.role !== 'ADMIN') {
    return <AccessDenied message="Acceso restringido a administradores" />
  }
  
  // Renderizar estrellas para calificación general
  const renderRatingFilter = () => {
    const options = [
      { value: '', label: 'Todas' },
      { value: '1', label: '1+ estrellas' },
      { value: '2', label: '2+ estrellas' },
      { value: '3', label: '3+ estrellas' },
      { value: '4', label: '4+ estrellas' },
      { value: '5', label: '5 estrellas' },
    ]
    
    return (
      <Select 
        value={minRating} 
        onValueChange={(value) => setMinRating(value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por calificación" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">
        Administración de Encuestas de Satisfacción
      </h1>
      
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-muted/50 p-4 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <SearchIcon className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Buscar por paciente o terapeuta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters()}
            />
          </div>
        </div>
        
        <div>
          {renderRatingFilter()}
        </div>
        
        <div>
          <Select 
            value={`${sortField}:${sortOrder}`} 
            onValueChange={(value) => {
              const [field, order] = value.split(':')
              setSortField(field)
              setSortOrder(order)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt:desc">Más recientes</SelectItem>
              <SelectItem value="createdAt:asc">Más antiguas</SelectItem>
              <SelectItem value="satisfaction:desc">Mayor calificación</SelectItem>
              <SelectItem value="satisfaction:asc">Menor calificación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={updateFilters}>
          Aplicar filtros
        </Button>
      </div>
      
      {/* Lista de encuestas */}
      <div className="space-y-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            {error}
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <p className="text-xl font-medium text-gray-500">
              No se encontraron encuestas
            </p>
            <p className="text-gray-500 mt-1">
              Ajusta los filtros o intenta de nuevo más tarde
            </p>
          </div>
        ) : (
          <>
            {surveys.map((survey) => (
              <Card key={survey.id} className="p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="mb-4 md:mb-0">
                    <p className="font-medium">
                      {survey.appointment.patient.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(survey.appointment.date), 'PPpp', { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Terapeuta: {survey.appointment.therapist.name}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array(5).fill(0).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-5 w-5 ${i < survey.satisfaction ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="font-medium">{survey.satisfaction}/5</span>
                  </div>
                </div>
                
                {survey.comments && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Comentarios:
                    </p>
                    <div className="bg-muted/30 p-3 rounded text-gray-700">
                      {survey.comments}
                    </div>
                  </div>
                )}
              </Card>
            ))}
            
            {/* Paginación */}
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Button>
              
              <div className="text-sm">
                Página {currentPage} de {totalPages}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
