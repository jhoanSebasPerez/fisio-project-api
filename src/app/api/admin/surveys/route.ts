import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface ExtendedSession {
  user: {
    id: string;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación y permisos
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const minRating = url.searchParams.get('minRating') 
      ? parseInt(url.searchParams.get('minRating')!) 
      : undefined;

    // Validar parámetros
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(50, Math.max(5, pageSize)); // Entre 5 y 50
    
    // Construir consulta
    const whereClause: any = {};
    
    // Filtro por calificación mínima
    if (minRating !== undefined) {
      whereClause.satisfaction = {
        gte: minRating
      };
    }
    
    // Búsqueda por texto
    if (search) {
      whereClause.OR = [
        {
          appointment: {
            patient: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          appointment: {
            therapist: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          comments: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    // Validar campo de ordenación
    const allowedSortFields = ['createdAt', 'satisfaction'];
    const finalSortField = allowedSortFields.includes(sortField) 
      ? sortField 
      : 'createdAt';
    
    // Validar orden
    const finalSortOrder = ['asc', 'desc'].includes(sortOrder) 
      ? sortOrder as 'asc' | 'desc'
      : 'desc';
    
    // Contar total de resultados
    const total = await prisma.surveyResponse.count({
      where: whereClause
    });
    
    // Obtener resultados paginados
    const surveys = await prisma.surveyResponse.findMany({
      where: whereClause,
      orderBy: {
        [finalSortField]: finalSortOrder
      },
      include: {
        appointment: {
          select: {
            id: true,
            date: true,
            patient: {
              select: {
                id: true,
                name: true,
              }
            },
            therapist: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      skip: (validatedPage - 1) * validatedPageSize,
      take: validatedPageSize
    });
    
    return NextResponse.json({
      surveys,
      total,
      page: validatedPage,
      pageSize: validatedPageSize,
      totalPages: Math.ceil(total / validatedPageSize)
    });
  } catch (error) {
    console.error('Error al listar encuestas de satisfacción:', error);
    return NextResponse.json(
      { error: 'Error al recuperar las encuestas de satisfacción' },
      { status: 500 }
    );
  }
}
