import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';

// Interfaces que coinciden con los modelos de Prisma
interface Survey {
  id: string;
  appointmentId: string;
  patientId: string;
  satisfaction: number;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment: {
    date: Date;
    therapistId: string | null;
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    
    // Verificar autenticación
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401 }
      );
    }
    
    // Solo ADMIN y THERAPIST pueden acceder a las analíticas
    if (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST') {
      return new NextResponse(
        JSON.stringify({ error: 'Permisos insuficientes' }),
        { status: 403 }
      );
    }
    
    const searchParams = req.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const therapistIdParam = searchParams.get('therapistId');
    
    // Configurar período de tiempo (predeterminado: 30 días)
    const days = daysParam ? parseInt(daysParam) : 30;
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days));
    
    // Construir filtros de consulta
    let whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Si el usuario es terapeuta, solo ve sus propias encuestas
    if (session.user.role === 'THERAPIST') {
      whereClause.appointment = {
        therapistId: session.user.id
      };
    } 
    // Si se especifica un terapeuta específico (para admin)
    else if (therapistIdParam && therapistIdParam !== 'all') {
      whereClause.appointment = {
        therapistId: therapistIdParam
      };
    }
    
    // 1. Obtener todas las encuestas en el periodo
    const surveys = await prisma.surveyResponse.findMany({
      where: whereClause,
      include: {
        appointment: {
          select: {
            date: true,
            therapistId: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // 2. Calcular distribución de calificaciones (1-5 estrellas)
    // Inicializamos con índice 0 en 0 para facilitar el mapeo por índice
    const ratingDistribution = [0, 0, 0, 0, 0, 0]; // [0, 1-star, 2-star, 3-star, 4-star, 5-star]
    
    surveys.forEach((survey) => {
      const rating = survey.satisfaction;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });
    
    // 3. Calcular promedio general
    const totalRating = surveys.reduce((sum: number, survey) => sum + survey.satisfaction, 0);
    const averageRating = surveys.length > 0 ? totalRating / surveys.length : 0;
    
    // 4. Preparar datos para gráfico de tendencia diaria
    const dailyData = new Map<string, { total: number, count: number }>();
    
    // Inicializar cada día del período con 0 para mostrar días sin datos
    for (let i = 0; i <= days; i++) {
      const date = format(subDays(endDate, i), 'yyyy-MM-dd');
      dailyData.set(date, { total: 0, count: 0 });
    }
    
    // Agregar datos reales
    surveys.forEach((survey) => {
      const date = format(new Date(survey.createdAt), 'yyyy-MM-dd');
      const current = dailyData.get(date) || { total: 0, count: 0 };
      
      dailyData.set(date, {
        total: current.total + survey.satisfaction,
        count: current.count + 1
      });
    });
    
    // Convertir a array ordenado por fecha
    const dailyAverages = Array.from(dailyData.entries())
      .map(([date, values]) => ({
        date,
        average: values.count > 0 ? values.total / values.count : 0,
        count: values.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      // Filtrar días con average = 0 para mejorar visualización
      .filter(day => day.count > 0);
    
    return NextResponse.json({
      totalCount: surveys.length,
      averageRating,
      ratingDistribution,
      dailyAverages
    });
    
  } catch (error: any) {
    console.error('Error al generar analytics de encuestas:', error);
    
    return new NextResponse(
      JSON.stringify({ error: 'Error al procesar la solicitud' }),
      { status: 500 }
    );
  }
}
