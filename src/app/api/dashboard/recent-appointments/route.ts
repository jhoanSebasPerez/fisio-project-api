import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { AppointmentStatus, Prisma } from '@prisma/client';

interface ExtendedSession {
  user: {
    id: string;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

// Define the type for appointment with included relations
type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    patient: {
      select: {
        id: boolean;
        name: boolean;
      }
    };
    appointmentServices: {
      include: {
        service: {
          select: {
            name: boolean;
          }
        }
      }
    }
  }
}>

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

    // Obtener la fecha actual
    const now = new Date();
    
    // Construir la consulta base
    let query: any = {
      where: {
        // Mostrar solo citas futuras
        date: {
          gte: now
        },
        // Excluir citas canceladas
        status: {
          not: 'CANCELLED'
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 5,
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        },
        appointmentServices: {
          include: {
            service: {
              select: {
                name: true
              }
            }
          }
        }
      }
    };

    // Filtrar según rol
    if (session.user.role === 'ADMIN') {
      // Admin ve todas las citas
    } else if (session.user.role === 'THERAPIST') {
      // Terapeuta solo ve sus propias citas
      query.where.therapistId = session.user.id;
    } else {
      // Paciente solo ve sus propias citas
      query.where.patientId = session.user.id;
    }

    // Obtener las citas
    const appointments = await prisma.appointment.findMany(query) as AppointmentWithRelations[];

    // Formatear los datos para la respuesta
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      date: appointment.date.toISOString(),
      patientName: appointment.patient.name,
      services: appointment.appointmentServices.map(as => as.service.name),
      // Mapear los estados de la BD a los estados requeridos por el frontend
      status: mapStatusToFrontend(appointment.status)
    }));

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    console.error('RECENT_APPOINTMENTS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener las citas recientes' },
      { status: 500 }
    );
  }
}

// Función para convertir los estados de la base de datos a formato frontend
function mapStatusToFrontend(status: string): 'confirmed' | 'pending' | 'cancelled' {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'confirmed';
    case 'SCHEDULED':
    case 'RESCHEDULED':
      return 'pending';
    case 'CANCELLED':
    default:
      return 'cancelled';
  }
}
