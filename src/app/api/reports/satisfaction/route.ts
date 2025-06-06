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

    // Obtener todas las reseñas en el período
    const reviews = await prisma.review.findMany({
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
    const overall = calculateOverallSatisfaction(reviews);
    
    // Obtener satisfacción por terapeuta
    const therapists = await calculateSatisfactionByTherapist(reviews, startDate, endDate);
    
    // Calcular evolución temporal de satisfacción
    const trend = calculateSatisfactionTrend(reviews);

    // Calcular métricas de respuestas por categoría
    const categories = calculateCategoryMetrics(reviews);

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reviewsCount: reviews.length,
      overall,
      therapists,
      trend,
      categories
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
function calculateOverallSatisfaction(reviews: any[]) {
  if (reviews.length === 0) {
    return {
      average: 0,
      distribution: [0, 0, 0, 0, 0] // Distribución por 1, 2, 3, 4, 5 estrellas
    };
  }

  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  const average = sum / reviews.length;
  
  // Calcular distribución de calificaciones (1-5 estrellas)
  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach(review => {
    const rating = Math.max(1, Math.min(5, review.rating));
    distribution[rating - 1]++;
  });
  
  // Convertir a porcentajes
  const percentages = distribution.map(count => 
    Math.round((count / reviews.length) * 100 * 100) / 100
  );
  
  return {
    average: Math.round(average * 100) / 100,
    distribution: percentages
  };
}

// Calcular satisfacción por terapeuta
async function calculateSatisfactionByTherapist(reviews: any[], startDate: Date, endDate: Date) {
  // Obtener todos los terapeutas que han tenido citas en el período
  const therapists = await prisma.user.findMany({
    where: {
      role: 'THERAPIST',
      appointments: {
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
      appointments: {
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
    // Filtrar reseñas por terapeuta
    const therapistReviews = reviews.filter(
      r => r.appointment.therapist.id === therapist.id
    );
    
    // Obtener total de citas completadas
    const completedAppointments = therapist.appointments.length;
    
    // Citas con reseñas
    const reviewedAppointments = therapistReviews.length;
    
    // Calcular satisfacción si hay reseñas
    let satisfactionRate = 0;
    if (reviewedAppointments > 0) {
      const sum = therapistReviews.reduce((total, r) => total + r.rating, 0);
      satisfactionRate = sum / reviewedAppointments;
    }
    
    return {
      id: therapist.id,
      name: therapist.name,
      completedAppointments,
      reviewedAppointments,
      reviewRate: completedAppointments > 0 
        ? Math.round((reviewedAppointments / completedAppointments) * 100 * 100) / 100 
        : 0,
      satisfactionRate: Math.round(satisfactionRate * 100) / 100
    };
  }).sort((a, b) => b.satisfactionRate - a.satisfactionRate);
}

// Calcular evolución temporal de satisfacción
function calculateSatisfactionTrend(reviews: any[]) {
  // Agrupar por mes
  const byMonth: Record<string, any[]> = {};
  
  reviews.forEach(review => {
    const date = new Date(review.appointment.date);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    if (!byMonth[key]) {
      byMonth[key] = [];
    }
    byMonth[key].push(review);
  });
  
  // Calcular promedio por mes
  return Object.entries(byMonth)
    .map(([month, monthReviews]) => {
      const sum = monthReviews.reduce((total, r) => total + r.rating, 0);
      return {
        month,
        average: Math.round((sum / monthReviews.length) * 100) / 100,
        count: monthReviews.length
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month)); // Ordenar cronológicamente
}

// Calcular métricas por categoría
function calculateCategoryMetrics(reviews: any[]) {
  // Suponiendo que hay campos en las reseñas para diferentes categorías
  // Por ejemplo: atención (professionalism), efectividad (effectiveness), 
  // instalaciones (facilities), y puntualidad (punctuality)
  
  if (reviews.length === 0) {
    return {
      professionalism: 0,
      effectiveness: 0,
      facilities: 0,
      punctuality: 0
    };
  }
  
  let professionalism = 0;
  let effectiveness = 0;
  let facilities = 0;
  let punctuality = 0;
  let count = 0;
  
  reviews.forEach(review => {
    // Sumar valores por categoría (si existen los campos en la reseña)
    if (review.professionalismRating) professionalism += review.professionalismRating;
    if (review.effectivenessRating) effectiveness += review.effectivenessRating;
    if (review.facilitiesRating) facilities += review.facilitiesRating;
    if (review.punctualityRating) punctuality += review.punctualityRating;
    count++;
  });
  
  // Calcular promedios
  return {
    professionalism: count > 0 ? Math.round((professionalism / count) * 100) / 100 : 0,
    effectiveness: count > 0 ? Math.round((effectiveness / count) * 100) / 100 : 0,
    facilities: count > 0 ? Math.round((facilities / count) * 100) / 100 : 0,
    punctuality: count > 0 ? Math.round((punctuality / count) * 100) / 100 : 0
  };
}
