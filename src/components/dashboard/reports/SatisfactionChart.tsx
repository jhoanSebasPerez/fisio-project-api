import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Bar,
  BarChart
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Star } from 'lucide-react';
import { dateRangeToString } from '@/lib/utils';
import { SelectValue, SelectTrigger, Select, SelectContent, SelectItem } from '@/components/ui/select';

interface MonthlyTrend {
  month: string;
  average: number;
  count: number;
}

interface TherapistSatisfaction {
  id: string;
  name: string;
  completedAppointments: number;
  reviewedAppointments: number;
  reviewRate: number;
  satisfactionRate: number;
}

interface CategoryMetrics {
  professionalism: number;
  effectiveness: number;
  facilities: number;
  punctuality: number;
}

interface SatisfactionData {
  startDate: string;
  endDate: string;
  reviewsCount: number;
  overall: {
    average: number;
    distribution: number[];
  };
  therapists: TherapistSatisfaction[];
  trend: MonthlyTrend[];
  categories: CategoryMetrics;
}

interface SatisfactionChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function SatisfactionChart({ startDate, endDate }: SatisfactionChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL con parámetros
        let url = '/api/reports/satisfaction';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
        
        if (selectedTherapist !== 'all') {
          params.append('therapistId', selectedTherapist);
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
        console.error('Error fetching satisfaction data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate, selectedTherapist]);

  // Formatear las etiquetas de meses para el gráfico de tendencias
  const formatMonthLabel = (month: string) => {
    try {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    } catch {
      return month;
    }
  };

  // Preparar datos para el gráfico de radar
  const prepareRadarData = () => {
    if (!data?.categories) return [];
    
    return [
      {
        category: 'Profesionalismo',
        value: data.categories.professionalism * 20, // Escala 0-100
      },
      {
        category: 'Efectividad',
        value: data.categories.effectiveness * 20,
      },
      {
        category: 'Instalaciones',
        value: data.categories.facilities * 20,
      },
      {
        category: 'Puntualidad',
        value: data.categories.punctuality * 20,
      }
    ];
  };

  // Preparar datos para el gráfico de distribución de estrellas
  const prepareStarDistribution = () => {
    if (!data?.overall.distribution) return [];
    
    return data.overall.distribution.map((percentage, index) => ({
      stars: `${index + 1} ${index === 0 ? 'estrella' : 'estrellas'}`,
      count: percentage
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Satisfacción de Pacientes
            {data && data.overall.average > 0 && (
              <span className="ml-2 text-yellow-500 flex items-center">
                {data.overall.average.toFixed(1)}
                <Star className="h-4 w-4 ml-1 fill-yellow-500" />
              </span>
            )}
          </CardTitle>
          {data && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
              <CalendarIcon size={12} />
              {dateRangeToString(new Date(data.startDate), new Date(data.endDate))}
            </Badge>
          )}
        </div>
        <CardDescription>
          Análisis de satisfacción de pacientes basado en {data?.reviewsCount || 0} reseñas
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
        ) : !data || data.reviewsCount === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No hay suficientes reseñas para mostrar datos de satisfacción.
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <Select 
                value={selectedTherapist}
                onValueChange={setSelectedTherapist}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por fisioterapeuta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los fisioterapeutas</SelectItem>
                  {data.therapists.map((therapist) => (
                    <SelectItem key={therapist.id} value={therapist.id}>
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tendencia temporal de la satisfacción */}
              <div>
                <h4 className="text-sm font-medium mb-2">Evolución de la Satisfacción</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.trend}
                      margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatMonthLabel}
                      />
                      <YAxis 
                        domain={[0, 5]} 
                        ticks={[0, 1, 2, 3, 4, 5]}
                        label={{ 
                          value: 'Calificación Promedio', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' } 
                        }}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [`${value} de 5`, 'Calificación']}
                        labelFormatter={formatMonthLabel}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line 
                        type="monotone" 
                        dataKey="average" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                        name="Calificación"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Distribución de estrellas */}
              <div>
                <h4 className="text-sm font-medium mb-2">Distribución de Calificaciones</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareStarDistribution()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis 
                        dataKey="stars" 
                        type="category" 
                        tick={{ fontSize: 12 }} 
                        width={100}
                      />
                      <RechartsTooltip formatter={(value) => [`${value}%`, 'Porcentaje']} />
                      <Bar 
                        dataKey="count" 
                        fill="#ffc658" 
                        barSize={30} 
                        name="Porcentaje"
                        label={{ 
                          position: 'right', 
                          formatter: (value: number) => `${value}%` 
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Categorías de satisfacción */}
            <div className="mt-8">
              <h4 className="text-sm font-medium mb-4">Categorías de Satisfacción</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={prepareRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, 'Valoración']} />
                    <Radar
                      name="Satisfacción"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Satisfacción por terapeuta */}
            <div className="mt-8">
              <h4 className="text-sm font-medium mb-4">Satisfacción por Fisioterapeuta</h4>
              {data.therapists.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No hay datos disponibles por fisioterapeuta para el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">Fisioterapeuta</th>
                        <th className="p-2 text-right">Citas Completadas</th>
                        <th className="p-2 text-right">Reseñas Recibidas</th>
                        <th className="p-2 text-right">Tasa de Reseñas</th>
                        <th className="p-2 text-right">Satisfacción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.therapists.map((therapist) => (
                        <tr key={therapist.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{therapist.name}</td>
                          <td className="p-2 text-right">{therapist.completedAppointments}</td>
                          <td className="p-2 text-right">{therapist.reviewedAppointments}</td>
                          <td className="p-2 text-right">{therapist.reviewRate}%</td>
                          <td className="p-2 text-right flex items-center justify-end">
                            {therapist.satisfactionRate.toFixed(1)}
                            <Star className="h-3 w-3 ml-1 fill-yellow-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
