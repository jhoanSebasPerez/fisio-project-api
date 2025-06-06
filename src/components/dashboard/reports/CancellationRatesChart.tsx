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
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { dateRangeToString } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PeriodData {
  period: string;
  total: number;
  canceled: number;
  rate: number;
}

interface CancelReason {
  reason: string;
  count: number;
  percentage: number;
}

interface ChartData {
  startDate: string;
  endDate: string;
  groupBy: string;
  cancellationRates: PeriodData[];
  cancelReasons: CancelReason[];
  overall: {
    total: number;
    canceled: number;
    rate: number;
  };
}

interface CancellationRatesChartProps {
  startDate?: Date;
  endDate?: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export function CancellationRatesChart({ startDate, endDate }: CancellationRatesChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [groupBy, setGroupBy] = useState<string>('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Construir URL con parámetros
        let url = '/api/reports/cancellation-rates';
        const params = new URLSearchParams();
        
        params.append('groupBy', groupBy);
        
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
        
        url = `${url}?${params.toString()}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching cancellation rates data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [startDate, endDate, groupBy]);

  // Formatear etiquetas para el eje X según el tipo de agrupación
  const formatXAxisTick = (value: string) => {
    try {
      switch (groupBy) {
        case 'day':
          return format(parseISO(value), 'dd MMM', { locale: es });
        case 'week':
          return `Sem ${format(parseISO(value), 'dd MMM', { locale: es })}`;
        case 'month':
        default:
          const [year, month] = value.split('-');
          return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM yy', { locale: es });
      }
    } catch (error) {
      return value;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Tasas de Cancelación</CardTitle>
          {data && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
              <CalendarIcon size={12} />
              {dateRangeToString(new Date(data.startDate), new Date(data.endDate))}
            </Badge>
          )}
        </div>
        <CardDescription>
          Análisis de las tasas de cancelación y sus principales motivos
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
        ) : data && data.cancellationRates.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No hay datos suficientes para mostrar tasas de cancelación.
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-medium">
                Tasa de cancelación general: <span className="font-bold text-blue-600">{data?.overall.rate}%</span>
              </div>
              <Select 
                value={groupBy} 
                onValueChange={(value) => setGroupBy(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Agrupar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Por Mes</SelectItem>
                  <SelectItem value="week">Por Semana</SelectItem>
                  <SelectItem value="day">Por Día</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3">
                <h4 className="text-sm font-medium mb-2">Evolución de las tasas de cancelación</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data?.cancellationRates || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="period" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatXAxisTick}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        label={{ 
                          value: 'Tasa de Cancelación (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' } 
                        }}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'rate') return [`${value}%`, 'Tasa de Cancelación'];
                          if (name === 'total') return [value, 'Citas Totales'];
                          if (name === 'canceled') return [value, 'Citas Canceladas'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => formatXAxisTick(label)}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        activeDot={{ r: 8 }}
                        name="rate" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-sm font-medium mb-2">Motivos de Cancelación</h4>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.cancelReasons || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {data?.cancelReasons.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend layout="vertical" verticalAlign="middle" align="right" />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          const reason = props.payload.reason;
                          return [`${value} (${props.payload.percentage}%)`, reason];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Resumen de Cancelaciones</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border rounded p-4">
                  <div className="text-2xl font-bold text-center">{data?.overall.total}</div>
                  <div className="text-xs text-muted-foreground text-center">Citas Totales</div>
                </Card>
                <Card className="border rounded p-4">
                  <div className="text-2xl font-bold text-center text-red-500">{data?.overall.canceled}</div>
                  <div className="text-xs text-muted-foreground text-center">Citas Canceladas</div>
                </Card>
                <Card className="border rounded p-4">
                  <div className="text-2xl font-bold text-center text-blue-500">{data?.overall.rate}%</div>
                  <div className="text-xs text-muted-foreground text-center">Tasa de Cancelación</div>
                </Card>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
