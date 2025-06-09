'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, Stethoscope, CalendarCheck, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { TodayAppointments } from '@/components/dashboard/therapist/TodayAppointments';
import WeeklyCalendar from '@/components/calendar/WeeklyCalendar';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  appointmentsToday: number;
  upcomingAppointments: number;
  totalPatients: number;
  totalTherapists: number;
}

interface RecentAppointment {
  id: string;
  date: string;
  patientName: string;
  services: string[];
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface PopularService {
  id: string;
  name: string;
  imageUrl: string;
  count: number;
  percentage: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'ADMIN';
  const isTherapist = session?.user?.role === 'THERAPIST';
  const [stats, setStats] = useState<DashboardStats>({
    appointmentsToday: 0,
    upcomingAppointments: 0,
    totalPatients: 0,
    totalTherapists: 0
  });
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [popularServices, setPopularServices] = useState<PopularService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  useEffect(() => {
    // Solo cargar datos del dashboard de administrador si el usuario es administrador
    if (isAdmin) {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          
          // Obtener estadísticas del dashboard
          const [statsResponse, appointmentsResponse] = await Promise.all([
            axios.get('/api/dashboard/stats'),
            axios.get('/api/dashboard/recent-appointments')
          ]);
          
          setStats(statsResponse.data);
          setRecentAppointments(appointmentsResponse.data);
          
          setLoading(false);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
          setLoading(false);
        }
      };
      
      fetchDashboardData();
    }
  }, [isAdmin]);

  // Obtener servicios populares solo para administradores
  useEffect(() => {
    if (isAdmin) {
      const fetchPopularServices = async () => {
        try {
          const response = await axios.get('/api/dashboard/popular-services');
          setPopularServices(response.data);
        } catch (error) {
          console.error('Error fetching popular services:', error);
        }
      };
      
      fetchPopularServices();
    }
  }, [isAdmin]);

  // isAdmin ya está declarado arriba
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(date);
  };
  
  const handleAppointmentClick = (appointment: any) => {
    router.push(`/dashboard/appointments/${appointment.id}`);
  };
  
  const toggleCalendarView = () => {
    setShowFullCalendar(!showFullCalendar);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {isTherapist ? 'Panel de Fisioterapeuta' : 'Panel de Control'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).format(new Date())}
        </p>
      </div>
      
      {/* Panel específico para administradores o fisioterapeutas */}
      {(isAdmin || isTherapist) && (
        <div className="space-y-6">
          {/* Calendario semanal */}
          <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Calendario Semanal</CardTitle>
                <CardDescription>
                  Vista general de las citas programadas esta semana
                </CardDescription>
              </div>
              <button 
                onClick={toggleCalendarView}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                {showFullCalendar ? 'Vista compacta' : 'Vista completa'}
              </button>
            </CardHeader>
            <CardContent className={showFullCalendar ? "" : "max-h-[500px] overflow-y-auto"}>              
              <WeeklyCalendar 
                therapistId={isTherapist ? session?.user?.id : undefined} 
                onAppointmentClick={handleAppointmentClick}
              />
            </CardContent>
          </Card>
          
          {/* Citas del día para el fisioterapeuta */}
          {isTherapist && <TodayAppointments />}
          
          {/* Componentes exclusivos para fisioterapeutas */}
          {isTherapist && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Próximas citas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Próximas Citas</CardTitle>
                  <CardDescription>Citas programadas para los próximos días</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center py-4">
                    <Link href="/dashboard/appointments" className="text-primary hover:underline inline-flex items-center">
                      Ver todas mis citas
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              {/* Accesos rápidos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Accesos Rápidos</CardTitle>
                  <CardDescription>Acciones comunes para fisioterapeutas</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Link href="/dashboard/appointments" className="flex flex-col items-center p-4 border rounded-md hover:bg-gray-50 transition-colors">
                    <Calendar className="h-6 w-6 mb-2 text-primary" />
                    <span className="text-sm font-medium">Citas</span>
                  </Link>
                  <Link href="/dashboard/patients" className="flex flex-col items-center p-4 border rounded-md hover:bg-gray-50 transition-colors">
                    <Users className="h-6 w-6 mb-2 text-primary" />
                    <span className="text-sm font-medium">Pacientes</span>
                  </Link>
                  <Link href="/dashboard/schedules" className="flex flex-col items-center p-4 border rounded-md hover:bg-gray-50 transition-colors">
                    <Clock className="h-6 w-6 mb-2 text-primary" />
                    <span className="text-sm font-medium">Horarios</span>
                  </Link>
                  <Link href="/dashboard/profile" className="flex flex-col items-center p-4 border rounded-md hover:bg-gray-50 transition-colors">
                    <Stethoscope className="h-6 w-6 mb-2 text-primary" />
                    <span className="text-sm font-medium">Mi Perfil</span>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* Panel para administradores */}
      {isAdmin && (
        <>
          {/* Estadísticas del Dashboard */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.appointmentsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? '' : '+2 más que ayer'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? '' : 'Para los próximos 7 días'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? '' : '+5 nuevos este mes'}
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Fisioterapeutas</CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalTherapists}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? '' : 'Equipo completo'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Próximas Citas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Próximas Citas</CardTitle>
            <CardDescription>
              Citas programadas para hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : recentAppointments.length > 0 ? (
              <div className="space-y-4">
                {recentAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${appointment.status === 'confirmed'
                          ? 'bg-green-500'
                          : appointment.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}>
                      </div>
                      <div>
                        <p className="font-medium">{appointment.patientName}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(appointment.date)} - {appointment.services.join(', ')}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/appointments/${appointment.id}`}
                      className="flex items-center text-sm text-primary hover:underline"
                    >
                      <span>Ver</span>
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                ))}
                <div className="pt-4 text-center">
                  <Link
                    href="/dashboard/appointments"
                    className="text-sm text-primary hover:underline inline-flex items-center"
                  >
                    Ver todas las citas
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <CalendarCheck className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-2">No hay citas programadas para hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Servicios más demandados (solo para administradores) */}
        {isAdmin && (
          <Card className="col-span-full md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Servicios Populares</CardTitle>
              <CardDescription className="text-sm">
                Los servicios más solicitados este mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading || popularServices.length === 0 ? (
                <div className="flex justify-center py-8">
                  {loading ? (
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  ) : (
                    <div className="text-center text-muted-foreground text-sm">No hay datos suficientes para mostrar</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {popularServices.map(service => (
                    <div key={service.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded overflow-hidden">
                            <img
                              src={service.imageUrl || '/images/services/default.jpg'}
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <span className="font-bold">{service.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full rounded-full" 
                          style={{ width: `${service.percentage}%` }}>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 text-center">
                    <Link
                      href="/dashboard/reports/services"
                      className="text-sm text-primary hover:underline inline-flex items-center"
                    >
                      Ver informe completo
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
