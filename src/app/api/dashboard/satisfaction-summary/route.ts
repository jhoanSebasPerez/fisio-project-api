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

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación y permisos (solo admin y terapeutas)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST')) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Fecha actual y fechas para filtros
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    
    // Filtro adicional para terapeutas (solo ver sus propias citas)
    const therapistFilter = session.user.role === 'THERAPIST' ? {
      appointment: {
        therapistId: session.user.id
      }
    } : {};
    
    // Obtener encuestas de los últimos 30 días
    const recentSurveys = await prisma.surveyResponse.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
          lt: tomorrow
        },
        ...therapistFilter
      },
      select: {
        satisfaction: true
      }
    });
    
    // Obtener encuestas de hoy
    const todaySurveys = await prisma.surveyResponse.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        ...therapistFilter
      },
      select: {
        satisfaction: true
      }
    });
    
    // Calcular promedios
    const calculateAverage = (surveys: { satisfaction: number }[]) => {
      if (surveys.length === 0) return 0;
      const sum = surveys.reduce((acc, survey) => acc + survey.satisfaction, 0);
      return sum / surveys.length;
    };
    
    return NextResponse.json({
      recentSurveys: {
        total: recentSurveys.length,
        averageSatisfaction: calculateAverage(recentSurveys)
      },
      todaySurveys: {
        count: todaySurveys.length,
        averageSatisfaction: calculateAverage(todaySurveys)
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen de satisfacción:', error);
    return NextResponse.json(
      { error: 'Error al obtener el resumen de satisfacción' },
      { status: 500 }
    );
  }
}
