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

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el primer día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let whereClause: any = {
      appointment: {
        date: {
          gte: firstDayOfMonth,
        }
      }
    };

    // Filtrar según rol
    if (session.user.role === 'THERAPIST') {
      // Terapeuta solo ve servicios de sus citas
      whereClause.appointment.therapistId = session.user.id;
    } else if (session.user.role === 'PATIENT') {
      // Paciente solo ve servicios de sus citas
      whereClause.appointment.patientId = session.user.id;
    }
    // Admin ve todos los servicios

    // Obtener servicios y contarlos
    const serviceCounts = await prisma.appointmentService.groupBy({
      by: ['serviceId'],
      where: whereClause,
      _count: {
        serviceId: true
      }
    });
    
    // Si no hay servicios, retornar array vacío
    if (serviceCounts.length === 0) {
      return NextResponse.json([]);
    }

    // Obtener el total de servicios para calcular porcentajes
    const totalServices = serviceCounts.reduce((sum, item) => sum + item._count.serviceId, 0);

    // Obtener detalles de los servicios
    const serviceIds = serviceCounts.map(item => item.serviceId);
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds
        }
      },
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    });

    // Combinar conteos con detalles de servicios
    const servicesWithPercentage = serviceCounts
      .map(count => {
        const service = services.find(s => s.id === count.serviceId);
        const percentage = Math.round((count._count.serviceId / totalServices) * 100);
        
        return {
          id: service?.id || count.serviceId,
          name: service?.name || 'Servicio desconocido',
          imageUrl: service?.imageUrl || '/images/services/default.jpg',
          count: count._count.serviceId,
          percentage
        };
      })
      // Ordenar por conteo descendente
      .sort((a, b) => b.count - a.count)
      // Tomar los 3 principales
      .slice(0, 3);

    return NextResponse.json(servicesWithPercentage);
  } catch (error) {
    console.error('POPULAR_SERVICES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener los servicios populares' },
      { status: 500 }
    );
  }
}
