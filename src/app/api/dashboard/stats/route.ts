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

    // Obtener fecha de hoy (inicio del día)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener estadísticas generales
    let appointmentsToday = 0;
    let upcomingAppointments = 0;
    let totalPatients = 0;
    let totalTherapists = 0;

    // Filtrar según rol
    if (session.user.role === 'ADMIN') {
      // Administradores ven todas las estadísticas
      [appointmentsToday, upcomingAppointments, totalPatients, totalTherapists] = await Promise.all([
        // Citas para hoy
        prisma.appointment.count({
          where: {
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Añadir 24 horas
            },
          },
        }),
        // Citas futuras (excluyendo hoy)
        prisma.appointment.count({
          where: {
            date: {
              gt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Después de hoy
            },
            status: {
              in: ['SCHEDULED', 'CONFIRMED']
            }
          },
        }),
        // Total de pacientes activos
        prisma.user.count({
          where: {
            role: 'PATIENT',
            active: true
          },
        }),
        // Total de fisioterapeutas activos
        prisma.user.count({
          where: {
            role: 'THERAPIST',
            active: true
          },
        }),
      ]);
    } else if (session.user.role === 'THERAPIST') {
      // Fisioterapeutas ven solo sus citas
      [appointmentsToday, upcomingAppointments] = await Promise.all([
        // Citas para hoy de este terapeuta
        prisma.appointment.count({
          where: {
            therapistId: session.user.id,
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Añadir 24 horas
            },
          },
        }),
        // Citas futuras de este terapeuta (excluyendo hoy)
        prisma.appointment.count({
          where: {
            therapistId: session.user.id,
            date: {
              gt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Después de hoy
            },
            status: {
              in: ['SCHEDULED', 'CONFIRMED']
            }
          },
        }),
      ]);

      // Total de pacientes atendidos por este terapeuta (con distinct)
      const distinctPatients = await prisma.appointment.findMany({
        where: {
          therapistId: session.user.id
        },
        distinct: ['patientId'],
        select: {
          patientId: true
        }
      });
      totalPatients = distinctPatients.length;
    } else {
      // Pacientes ven solo sus citas
      [appointmentsToday, upcomingAppointments] = await Promise.all([
        // Citas para hoy de este paciente
        prisma.appointment.count({
          where: {
            patientId: session.user.id,
            date: {
              gte: today,
              lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Añadir 24 horas
            },
          },
        }),
        // Citas futuras de este paciente (excluyendo hoy)
        prisma.appointment.count({
          where: {
            patientId: session.user.id,
            date: {
              gt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Después de hoy
            },
            status: {
              in: ['SCHEDULED', 'CONFIRMED']
            }
          },
        }),
      ]);
    }

    return NextResponse.json({
      appointmentsToday,
      upcomingAppointments,
      totalPatients,
      totalTherapists
    });
  } catch (error) {
    console.error('DASHBOARD_STATS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del dashboard' },
      { status: 500 }
    );
  }
}
