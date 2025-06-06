import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Extender el tipo Session para incluir los campos personalizados
interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

// GET para obtener el historial completo del paciente
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el rol es ADMIN o THERAPIST
    if (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'No tiene permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    // Verificar que el paciente existe
    const patient = await prisma.user.findUnique({
      where: { 
        id: patientId,
        role: 'PATIENT' // Asegurarse de que es un paciente
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todas las citas anteriores del paciente, ordenadas por fecha descendente
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
        status: 'COMPLETED', // Solo citas completadas
        date: {
          lte: new Date() // Solo citas que ya pasaron
        }
      },
      orderBy: {
        date: 'desc'
      },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        appointmentServices: {
          include: {
            service: true
          }
        },
        therapistNotes: {
          include: {
            therapist: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Calcular estadísticas
    const totalAppointments = appointments.length;
    const servicesReceived = appointments.reduce((acc, appointment) => {
      appointment.appointmentServices.forEach(as => {
        if (as.service) {
          const serviceName = as.service.name;
          acc[serviceName] = (acc[serviceName] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    // Construir la respuesta
    const patientHistory = {
      patient: patient,
      statistics: {
        totalAppointments,
        servicesReceived,
        firstVisit: totalAppointments > 0 ? appointments[appointments.length - 1].date : null,
        lastVisit: totalAppointments > 0 ? appointments[0].date : null
      },
      appointments: appointments
    };

    return NextResponse.json(patientHistory);
    
  } catch (error) {
    console.error('GET_PATIENT_HISTORY_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el historial del paciente' },
      { status: 500 }
    );
  }
}
