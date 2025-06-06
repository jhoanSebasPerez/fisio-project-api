import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, BarChart3, User } from 'lucide-react';
import { dateRangeToString } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface TherapistData {
  id: string;
  name: string;
  appointmentsCount: number;
  totalMinutes: number;
  occupancyRate: number;
  totalHours: number;
}

interface ChartData {
  startDate: string;
  endDate: string;
  businessDays: number;
  therapists: TherapistData[];
}

interface TherapistOccupancyChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function TherapistOccupancyChart({ startDate, endDate }: TherapistOccupancyChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChartData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL con los parámetros de fecha si se proporcionan
        let url = '/api/reports/therapist-occupancy';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
        
        const queryString = params.toString();
        if (queryString) {
          url = `${url}?${queryString}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching therapist occupancy data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate]);

  // Preparar datos para el gráfico
  const chartData = data?.therapists.map(t => ({
    name: t.name,
    'Tasa de Ocupación (%)': t.occupancyRate,
    'Horas Trabajadas': t.totalHours,
    'Número de Citas': t.appointmentsCount
  })) || [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ocupación de Fisioterapeutas</span>
          {data && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
              <CalendarIcon size={12} />
              {dateRangeToString(new Date(data.startDate), new Date(data.endDate))}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Análisis de la ocupación de cada fisioterapeuta basado en citas completadas
        </CardDescription>
      </CardHeader>
      <CardContent className="p-1 md:p-6">
        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-[300px] w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-muted-foreground">
            Error al cargar datos: {error}
          </div>
        ) : data && data.therapists.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No hay datos suficientes para mostrar la ocupación de fisioterapeutas.
          </div>
        ) : (
          <>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  barGap={10}
                  barCategoryGap={30}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    label={{ 
                      value: 'Tasa de Ocupación (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' } 
                    }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    label={{ 
                      value: 'Horas Trabajadas', 
                      angle: -90, 
                      position: 'insideRight',
                      style: { textAnchor: 'middle' } 
                    }}
                  />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'Tasa de Ocupación (%)') {
                      return [`${value}%`, name];
                    }
                    return [value, name];
                  }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar 
                    yAxisId="left"
                    dataKey="Tasa de Ocupación (%)" 
                    fill="#8884d8" 
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="Horas Trabajadas" 
                    fill="#82ca9d" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {data.therapists.map((therapist) => (
                  <Card key={therapist.id} className="border rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold">{therapist.name}</h4>
                      <Badge 
                        variant={therapist.occupancyRate > 80 ? "default" : 
                               (therapist.occupancyRate > 50 ? "secondary" : "outline")}
                      >
                        {therapist.occupancyRate}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{therapist.totalHours} horas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span>{therapist.appointmentsCount} citas</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
