import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logMedicalAccess } from '@/lib/audit';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

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

/**
 * Obtiene las citas de la semana agrupadas por día y terapeuta
 * 
 * Parámetros de consulta:
 * - week: Fecha en formato ISO (YYYY-MM-DD) para determinar la semana (por defecto, semana actual)
 * - therapistId: ID del terapeuta (opcional, solo para admins)
 */
export async function GET(request: Request) {
  try {
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const therapistIdParam = searchParams.get('therapistId');

    // Obtener la sesión del usuario
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo terapeutas y admins pueden acceder al calendario
    const isAdmin = session.user.role === 'ADMIN';
    const isTherapist = session.user.role === 'THERAPIST';

    if (!isAdmin && !isTherapist) {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a esta información' },
        { status: 403 }
      );
    }

    // Determinar fecha inicio y fin de semana
    let baseDate = new Date();
    if (weekParam) {
      baseDate = new Date(weekParam);
    }

    // Configurar para que la semana comience en lunes (1) en lugar de domingo (0)
    const startDate = startOfWeek(baseDate, { weekStartsOn: 1 });
    const endDate = endOfWeek(baseDate, { weekStartsOn: 1 });

    // Determinar terapeuta(s) para filtrar
    let therapistFilter: any = {};
    
    // Si es terapeuta, solo puede ver sus propias citas
    if (isTherapist) {
      therapistFilter = { therapistId: session.user.id };
    } 
    // Si es admin y especifica un terapeuta
    else if (isAdmin && therapistIdParam) {
      therapistFilter = { therapistId: therapistIdParam };
    }

    // Consultar citas para la semana seleccionada
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        ...therapistFilter
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
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
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Agrupar citas por día y terapeuta
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        date: date,
        dateString: date.toISOString().split('T')[0],
        dayName: new Intl.DateTimeFormat('es', { weekday: 'long' }).format(date),
        dayNumber: date.getDate(),
        month: new Intl.DateTimeFormat('es', { month: 'long' }).format(date),
        therapists: [] as any[]
      };
    });

    // Mapa para agrupar terapeutas y sus citas por día
    const therapistsByDay = new Map();

    // Procesar cada cita y organizarla en la estructura de datos
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      const dayIndex = Math.floor((appointmentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayIndex < 0 || dayIndex > 6) return; // Ignorar si está fuera de rango

      const dayKey = weekDays[dayIndex].dateString;
      const therapistId = appointment.therapistId || 'unassigned';
      
      if (!therapistsByDay.has(dayKey)) {
        therapistsByDay.set(dayKey, new Map());
      }
      
      const therapistsForDay = therapistsByDay.get(dayKey);
      
      if (!therapistsForDay.has(therapistId)) {
        therapistsForDay.set(therapistId, {
          id: therapistId,
          name: appointment.therapist?.name || 'Sin asignar',
          appointments: []
        });
      }
      
      // Añadir la cita a la lista del terapeuta para ese día
      therapistsForDay.get(therapistId).appointments.push(appointment);
    });

    // Rellenar los días de la semana con los terapeutas y sus citas
    weekDays.forEach(day => {
      if (therapistsByDay.has(day.dateString)) {
        day.therapists = Array.from(therapistsByDay.get(day.dateString).values());
      }
    });

    // Registrar acceso al calendario en logs de auditoría
    if (isTherapist) {
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'view',
        resourceType: 'appointment',
        resourceId: 'weekly-calendar',
        details: { 
          weekStart: startDate.toISOString(),
          weekEnd: endDate.toISOString(),
          appointmentCount: appointments.length
        }
      });
    }

    // Construir respuesta
    const calendarData = {
      weekStart: startDate.toISOString(),
      weekEnd: endDate.toISOString(),
      days: weekDays
    };

    // Añadir encabezados de seguridad
    const headers = new Headers();
    headers.append('Cache-Control', 'private, max-age=300'); // Permitir caché por 5 minutos
    headers.append('X-Content-Type-Options', 'nosniff');

    return NextResponse.json(calendarData, { headers });
  } catch (error) {
    console.error('GET_WEEKLY_APPOINTMENTS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el calendario de citas' },
      { status: 500 }
    );
  }
}
