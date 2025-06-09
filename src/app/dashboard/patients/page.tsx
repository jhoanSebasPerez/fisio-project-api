'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Search,
  UserIcon,
  Calendar,
  Mail,
  Phone,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import AccessDenied from '@/components/access-denied'
import Loading from '@/components/loading'

interface Patient {
  id: string
  name: string
  email: string
  phone: string
  appointmentsCount: number
  createdAt: string
}

interface PatientsResponse {
  patients: Patient[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function PatientsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = session?.user?.role === 'ADMIN'

  // Estados para la página
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<Patient[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  // Estados para filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('')
  const [hasAppointments, setHasAppointments] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // Función para cargar pacientes
  const loadPatients = async (page = 1) => {
    try {
      setLoading(true)
      
      // Construir parámetros de consulta
      const queryParams = new URLSearchParams()
      queryParams.set('page', page.toString())
      queryParams.set('limit', pagination.limit.toString())
      queryParams.set('sortBy', sortBy)
      queryParams.set('sortOrder', sortOrder)
      
      if (searchQuery) {
        queryParams.set('search', searchQuery)
      }
      
      if (hasAppointments) {
        queryParams.set('hasAppointments', 'true')
      }

      // Realizar la petición API
      const response = await fetch(`/api/patients?${queryParams.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Error al cargar pacientes: ${response.status}`)
      }
      
      const data: PatientsResponse = await response.json()
      setPatients(data.patients)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error al cargar pacientes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Efecto para cargar pacientes al montar el componente o cambiar filtros
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }
    
    // Verificar permisos
    if (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST') {
      return
    }
    
    loadPatients(pagination.page)
  }, [session, status, router, sortBy, sortOrder])

  // Funciones para manejar filtros y paginación
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadPatients(1)
  }
  
  const handleClearSearch = () => {
    setSearchQuery('')
    loadPatients(1)
  }

  const handlePageChange = (newPage: number) => {
    loadPatients(newPage)
  }

  const handleAppointmentsFilterChange = (value: string) => {
    setHasAppointments(value === 'true')
    loadPatients(1)
  }

  const handleSortChange = (newSortBy: string) => {
    // Si seleccionamos el mismo campo, invertimos el orden
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
    loadPatients(1)
  }

  // Verificar permisos
  if (status !== 'loading' && (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST'))) {
    return <AccessDenied />
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Gestión de Pacientes</CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'Administra todos los pacientes registrados en el sistema' 
                : 'Visualiza los pacientes que han agendado citas contigo'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros y búsqueda */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Búsqueda */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                )}
              </div>
            </form>

            {/* Filtro por citas */}
            {isAdmin && (
              <div className="w-full md:w-48">
                <Select
                  value={hasAppointments.toString()}
                  onValueChange={handleAppointmentsFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por citas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Todos los pacientes</SelectItem>
                    <SelectItem value="true">Con citas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ordenación */}
            <div className="w-full md:w-48">
              <Select
                value={sortBy}
                onValueChange={handleSortChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="createdAt">Fecha de registro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-48">
              <Button 
                onClick={() => loadPatients(1)} 
                className="w-full"
                variant="secondary"
              >
                Aplicar filtros
              </Button>
            </div>
          </div>

          {/* Tabla de pacientes */}
          {loading ? (
            <div className="flex justify-center py-10">
              <Loading />
            </div>
          ) : patients.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => handleSortChange('name')} className="cursor-pointer">
                        Nombre {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => handleSortChange('email')} className="cursor-pointer">
                        Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead className="text-center">Citas</TableHead>
                      <TableHead onClick={() => handleSortChange('createdAt')} className="cursor-pointer">
                        Fecha de registro {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            {patient.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            {patient.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            {patient.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {patient.appointmentsCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {format(new Date(patient.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                            >
                              Ver detalles
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/patients/${patient.id}/appointments`)}
                            >
                              Ver citas
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} pacientes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(pagination.page + 1, pagination.totalPages))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Siguiente
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserIcon className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="font-medium text-lg">No se encontraron pacientes</h3>
              <p className="text-gray-500 mt-1">
                {searchQuery
                  ? 'Intenta con otros términos de búsqueda'
                  : isAdmin
                  ? 'No hay pacientes registrados en el sistema'
                  : 'No tienes pacientes asignados todavía'}
              </p>
              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSearch}
                  className="mt-4"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
