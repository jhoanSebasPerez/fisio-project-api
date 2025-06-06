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

    // Establecer fechas por defecto si no se proporcionan
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    // Por defecto, 30 días atrás si no se proporciona fecha de inicio
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 30);

    // Consultar terapeutas activos
    const therapists = await prisma.user.findMany({
      where: {
        role: 'THERAPIST',
        active: true
      },
      select: {
        id: true,
        name: true
      }
    });

    // Para cada terapeuta, contar las citas completadas y calcular el tiempo total
    const therapistOccupancy = await Promise.all(
      therapists.map(async (therapist) => {
        // Obtener todas las citas completadas para este terapeuta en el rango de fechas
        const appointments = await prisma.appointment.findMany({
          where: {
            therapistId: therapist.id,
            status: 'COMPLETED',
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            appointmentServices: {
              include: {
                service: {
                  select: {
                    duration: true
                  }
                }
              }
            }
          }
        });

        // Calcular el tiempo total de citas (en minutos)
        const totalMinutes = appointments.reduce((total, appointment) => {
          const appointmentDuration = appointment.appointmentServices.reduce(
            (sum, appService) => sum + appService.service.duration, 0
          );
          return total + appointmentDuration;
        }, 0);

        // Calcular el tiempo de trabajo total disponible (asumiendo 8 horas por día laboral)
        const workdayDuration = 8 * 60; // 8 horas en minutos
        
        // Días laborales entre las fechas (considerando de lunes a viernes)
        const businessDays = countBusinessDays(startDate, endDate);
        
        // Tiempo total disponible teórico (en minutos)
        const totalAvailableMinutes = businessDays * workdayDuration;
        
        // Calcular la tasa de ocupación
        const occupancyRate = totalAvailableMinutes > 0 
          ? (totalMinutes / totalAvailableMinutes) * 100 
          : 0;

        return {
          id: therapist.id,
          name: therapist.name,
          appointmentsCount: appointments.length,
          totalMinutes,
          occupancyRate: Math.round(occupancyRate * 100) / 100, // Redondear a 2 decimales
          totalHours: Math.round(totalMinutes / 60 * 10) / 10, // Convertir a horas y redondear a 1 decimal
        };
      })
    );

    // Ordenar por tasa de ocupación (de mayor a menor)
    therapistOccupancy.sort((a, b) => b.occupancyRate - a.occupancyRate);

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      businessDays: countBusinessDays(startDate, endDate),
      therapists: therapistOccupancy
    });
  } catch (error) {
    console.error('THERAPIST_OCCUPANCY_REPORT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte de ocupación de fisioterapeutas' },
      { status: 500 }
    );
  }
}

// Función para contar días laborales (de lunes a viernes) entre dos fechas
function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // No contar sábados (6) ni domingos (0)
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
}
