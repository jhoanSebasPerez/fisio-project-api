import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface ExtendedSession {
  user: {
    id: string;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación y permisos
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Obtener parámetros de la solicitud
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const groupByParam = url.searchParams.get('groupBy') || 'month'; // 'month', 'week', 'day'

    // Establecer fechas por defecto si no se proporcionan
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    // Por defecto, 6 meses atrás si no se proporciona fecha de inicio
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getFullYear(), endDate.getMonth() - 6, 1);

    // Obtener todas las citas en el período
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        date: true,
        status: true,
        canceledAt: true,
        cancelReason: true
      }
    });

    // Agrupar citas por período (mes, semana o día)
    const groupedAppointments = groupAppointmentsByPeriod(appointments, groupByParam);

    // Calcular las tasas de cancelación para cada período
    const cancellationRates = calculateCancellationRates(groupedAppointments);

    // Calcular motivos de cancelación
    const cancelReasons = calculateCancelReasons(appointments);

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      groupBy: groupByParam,
      cancellationRates,
      cancelReasons,
      overall: {
        total: appointments.length,
        canceled: appointments.filter(a => a.status === 'CANCELED').length,
        rate: calculateOverallRate(appointments)
      }
    });
  } catch (error) {
    console.error('CANCELLATION_RATES_REPORT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte de tasas de cancelación' },
      { status: 500 }
    );
  }
}

// Función para agrupar citas por período
function groupAppointmentsByPeriod(appointments: any[], groupBy: string) {
  const grouped: Record<string, any[]> = {};

  appointments.forEach(appointment => {
    let key: string;
    const date = new Date(appointment.date);
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'week':
        // Obtener lunes de la semana
        const dayOfWeek = date.getDay() || 7; // Convertir 0 (domingo) a 7
        const monday = new Date(date);
        monday.setDate(date.getDate() - dayOfWeek + 1);
        key = monday.toISOString().split('T')[0]; // YYYY-MM-DD del lunes
        break;
      case 'month':
      default:
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(appointment);
  });

  return grouped;
}

// Calcular tasas de cancelación por período
function calculateCancellationRates(groupedAppointments: Record<string, any[]>) {
  const rates = Object.entries(groupedAppointments).map(([period, appts]) => {
    const total = appts.length;
    const canceled = appts.filter(a => a.status === 'CANCELED').length;
    const rate = total > 0 ? (canceled / total) * 100 : 0;
    
    return {
      period,
      total,
      canceled,
      rate: Math.round(rate * 100) / 100 // Redondear a 2 decimales
    };
  });

  // Ordenar por período (fecha)
  return rates.sort((a, b) => a.period.localeCompare(b.period));
}

// Calcular motivos de cancelación
function calculateCancelReasons(appointments: any[]) {
  const canceledAppointments = appointments.filter(a => a.status === 'CANCELED');
  const reasons: Record<string, number> = {};
  
  canceledAppointments.forEach(appointment => {
    const reason = appointment.cancelReason || 'Sin especificar';
    if (!reasons[reason]) {
      reasons[reason] = 0;
    }
    reasons[reason]++;
  });
  
  // Convertir a array de objetos para API
  return Object.entries(reasons).map(([reason, count]) => ({
    reason,
    count,
    percentage: Math.round((count / canceledAppointments.length) * 100 * 100) / 100
  })).sort((a, b) => b.count - a.count);
}

// Calcular tasa de cancelación general
function calculateOverallRate(appointments: any[]) {
  const total = appointments.length;
  const canceled = appointments.filter(a => a.status === 'CANCELED').length;
  return total > 0 ? Math.round((canceled / total) * 100 * 100) / 100 : 0;
}
