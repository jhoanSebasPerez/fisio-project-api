'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/date-range-picker';
import { CalendarIcon, FileBarChart, Users, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { addMonths, addDays, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { TherapistOccupancyChart } from '@/components/dashboard/reports/TherapistOccupancyChart';
import { CancellationRatesChart } from '@/components/dashboard/reports/CancellationRatesChart';
import { SatisfactionChart } from '@/components/dashboard/reports/SatisfactionChart';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Badge } from '@/components/ui/badge';

// Using DateRange from react-day-picker instead of local interface

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('occupancy');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  
  // Handler for DatePickerWithRange to fix type compatibility
  const handleDateRangeChange = (date: DateRange | undefined) => {
    if (date) {
      setDateRange(date);
    }
  };

  // Verificar si el usuario es administrador
  const isAdmin = session?.user?.role === 'ADMIN';

  if (status === 'loading') {
    return (
      <DashboardShell>
        <DashboardHeader heading="Reportes" text="Visualiza estadísticas y métricas de tu clínica">
          <div className="w-[250px]">
            <Skeleton className="h-10 w-full" />
          </div>
        </DashboardHeader>
        <div className="grid gap-4">
          <Skeleton className="h-[600px]" />
        </div>
      </DashboardShell>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Reportes" text="Visualiza estadísticas y métricas de tu clínica" />
        <Card>
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a los reportes administrativos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta sección está disponible únicamente para administradores del sistema.
              Si necesitas acceder a esta información, por favor contacta a un administrador.
            </p>
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  // Funciones para cambiar rápidamente los rangos de fechas
  const setLastMonth = () => {
    const today = new Date();
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    setDateRange({ from: firstDayLastMonth, to: lastDayLastMonth });
  };

  const setLastQuarter = () => {
    const today = new Date();
    setDateRange({
      from: subMonths(today, 3),
      to: today
    });
  };

  const setLastYear = () => {
    const today = new Date();
    setDateRange({
      from: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()),
      to: today
    });
  };

  const setLastWeek = () => {
    const today = new Date();
    setDateRange({
      from: addDays(today, -7),
      to: today
    });
  };

  return (
    <DashboardShell>
      <DashboardHeader heading="Reportes Administrativos" text="Análisis detallado de métricas y rendimiento">
        <div className="flex flex-col sm:flex-row gap-2">
          <DatePickerWithRange
            onChange={handleDateRangeChange}
            className="w-full sm:w-auto"
          />
        </div>
      </DashboardHeader>

      <div className="flex flex-wrap gap-2 mb-6">
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted"
          onClick={setLastWeek}
        >
          Última semana
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted"
          onClick={setLastMonth}
        >
          Último mes
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted"
          onClick={setLastQuarter}
        >
          Últimos 3 meses
        </Badge>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted"
          onClick={setLastYear}
        >
          Último año
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="occupancy" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Ocupación
          </TabsTrigger>
          <TabsTrigger value="cancellations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Cancelaciones
          </TabsTrigger>
          <TabsTrigger value="satisfaction" className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Satisfacción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <TherapistOccupancyChart
            startDate={dateRange.from}
            endDate={dateRange.to}
          />
        </TabsContent>

        <TabsContent value="cancellations">
          <CancellationRatesChart
            startDate={dateRange.from}
            endDate={dateRange.to}
          />
        </TabsContent>

        <TabsContent value="satisfaction">
          <SatisfactionChart
            startDate={dateRange.from}
            endDate={dateRange.to}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Sobre los Reportes</CardTitle>
            <CardDescription>Consideraciones importantes sobre los datos visualizados</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Ocupación de Fisioterapeutas</h4>
                <p className="text-muted-foreground mt-1">
                  La ocupación se calcula en base a las citas completadas, considerando una jornada laboral de 8 horas
                  de lunes a viernes. Los días festivos no están excluidos del cálculo.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium">Tasas de Cancelación</h4>
                <p className="text-muted-foreground mt-1">
                  Este reporte muestra la proporción de citas canceladas respecto al total programado.
                  Los datos pueden ser agrupados por día, semana o mes para un análisis más detallado.
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium">Satisfacción de Pacientes</h4>
                <p className="text-muted-foreground mt-1">
                  Los datos se obtienen de las reseñas enviadas por los pacientes después de sus citas.
                  Sólo se incluyen citas marcadas como completadas y que tengan una reseña asociada.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start">
                <FileBarChart className="h-5 w-5 mt-0.5 mr-2 text-primary" />
                <div>
                  <p className="font-medium">Para mejores resultados</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Para una visualización más precisa, selecciona rangos de fechas más cortos. Los datos
                    mostrados se actualizan en tiempo real y reflejan la información actual en la base de datos.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
