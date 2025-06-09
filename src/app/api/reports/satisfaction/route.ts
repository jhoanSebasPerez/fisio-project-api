import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const therapistId = url.searchParams.get('therapistId') || undefined;

    // Establecer fechas por defecto si no se proporcionan
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    // Por defecto, 3 meses atrás si no se proporciona fecha de inicio
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);

    // Construir la consulta base
    const whereClause: any = {
      appointment: {
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    };

    // Filtrar por terapeuta si se proporciona ID
    if (therapistId) {
      whereClause.appointment.therapistId = therapistId;
    }

    // Obtener todas las encuestas en el período
    const surveyResponses = await prisma.surveyResponse.findMany({
      where: whereClause,
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            therapist: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Calcular promedios de satisfacción
    const overall = calculateOverallSatisfaction(surveyResponses);
    
    // Obtener satisfacción por terapeuta
    const therapists = await calculateSatisfactionByTherapist(surveyResponses, startDate, endDate);
    
    // Calcular evolución temporal de satisfacción
    const trend = calculateSatisfactionTrend(surveyResponses);

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      surveysCount: surveyResponses.length,
      overall,
      therapists,
      trend
    });
  } catch (error) {
    console.error('SATISFACTION_REPORT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al generar el reporte de satisfacción' },
      { status: 500 }
    );
  }
}

// Calcular satisfacción general
function calculateOverallSatisfaction(surveys: any[]) {
  if (surveys.length === 0) {
    return {
      average: 0,
      distribution: [0, 0, 0, 0, 0] // Distribución por 1, 2, 3, 4, 5 estrellas
    };
  }

  const sum = surveys.reduce((total, survey) => total + survey.satisfaction, 0);
  const average = sum / surveys.length;
  
  // Calcular distribución de calificaciones (1-5 estrellas)
  const distribution = [0, 0, 0, 0, 0];
  surveys.forEach(survey => {
    const rating = Math.max(1, Math.min(5, survey.satisfaction));
    distribution[rating - 1]++;
  });
  
  // Convertir a porcentajes
  const percentages = distribution.map(count => 
    Math.round((count / surveys.length) * 100 * 100) / 100
  );
  
  return {
    average: Math.round(average * 100) / 100,
    distribution: percentages
  };
}

// Calcular satisfacción por terapeuta
async function calculateSatisfactionByTherapist(surveys: any[], startDate: Date, endDate: Date) {
  // Obtener todos los terapeutas que han tenido citas en el período
  const therapists = await prisma.user.findMany({
    where: {
      role: 'THERAPIST',
      therapistAppointments: {
        some: {
          date: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        }
      }
    },
    select: {
      id: true,
      name: true,
      therapistAppointments: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        select: {
          id: true
        }
      }
    }
  });

  // Para cada terapeuta, calcular métricas de satisfacción
  return therapists.map(therapist => {
    // Filtrar encuestas por terapeuta
    const therapistSurveys = surveys.filter(
      s => s.appointment.therapist?.id === therapist.id
    );
    
    // Obtener total de citas completadas
    const completedAppointments = therapist.therapistAppointments.length;
    
    // Citas con encuestas
    const surveyedAppointments = therapistSurveys.length;
    
    // Calcular satisfacción si hay encuestas
    let satisfactionRate = 0;
    if (surveyedAppointments > 0) {
      const sum = therapistSurveys.reduce((total, s) => total + s.satisfaction, 0);
      satisfactionRate = sum / surveyedAppointments;
    }
    
    return {
      id: therapist.id,
      name: therapist.name,
      completedAppointments,
      surveyedAppointments,
      surveyRate: completedAppointments > 0 
        ? Math.round((surveyedAppointments / completedAppointments) * 100 * 100) / 100 
        : 0,
      satisfactionRate: Math.round(satisfactionRate * 100) / 100
    };
  }).sort((a, b) => b.satisfactionRate - a.satisfactionRate);  // Ordenar de mayor a menor satisfacción
}

// Calcular evolución temporal de satisfacción
function calculateSatisfactionTrend(surveys: any[]) {
  // Agrupar por mes
  const byMonth: Record<string, any[]> = {};
  
  surveys.forEach(survey => {
    const date = new Date(survey.appointment.date);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!byMonth[key]) {
      byMonth[key] = [];
    }
    byMonth[key].push(survey);
  });
  
  // Calcular promedio por mes
  return Object.entries(byMonth)
    .map(([month, monthSurveys]) => {
      const sum = monthSurveys.reduce((total, s) => total + s.satisfaction, 0);
      return {
        month,
        average: Math.round((sum / monthSurveys.length) * 100) / 100,
        count: monthSurveys.length
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month)); // Ordenar cronológicamente
}


