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

export async function GET(request: Request) {
  try {
    console.log('API: Recibida solicitud de citas para fisioterapeuta');
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    console.log('API: Estado de sesión:', session ? 'Autenticado' : 'No autenticado');

    // Verificar que el usuario esté autenticado y sea un fisioterapeuta
    if (!session) {
      console.log('API: Acceso denegado - No hay sesión de usuario');
      return NextResponse.json(
        { error: 'No autorizado', success: false },
        { status: 401 }
      );
    }

    if (session.user.role !== 'THERAPIST') {
      console.log(`API: Acceso denegado - Rol incorrecto: ${session.user.role}`);
      return NextResponse.json(
        { error: 'Acceso denegado', success: false, role: session.user.role },
        { status: 403 }
      );
    }
    
    console.log(`API: Usuario autorizado - ID: ${session.user.id}, Rol: ${session.user.role}`);

    const { searchParams } = new URL(request.url);
    
    // Establecer fecha para filtrar usando el parámetro recibido
    let dateFilter: Date;
    const dateParam = searchParams.get('date');
    
    console.log('API: Parámetro de fecha recibido:', dateParam);
    
    if (dateParam) {
      // Asegurarnos de trabajar con la fecha local
      // Formato esperado: yyyy-MM-dd
      const [year, month, day] = dateParam.split('-').map(Number);
      // Crear fecha usando componentes para evitar problemas de timezone
      dateFilter = new Date(year, month - 1, day); // month es 0-indexed en JS
    } else {
      // Por defecto, hoy (usando la fecha local)
      dateFilter = new Date();
    }
    
    console.log('API: Fecha para filtrar (local):', dateFilter.toLocaleDateString());
    
    // Crear fechas para inicio y fin del día manteniendo la zona horaria local
    // Crear startOfDay (00:00:00.000 local) 
    const startOfDay = new Date(dateFilter);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Crear endOfDay (23:59:59.999 local)
    const endOfDay = new Date(dateFilter);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('API: Inicio del día (local):', startOfDay.toLocaleString());
    console.log('API: Fin del día (local):', endOfDay.toLocaleString());
    console.log('API: Inicio del día (ISO):', startOfDay.toISOString());
    console.log('API: Fin del día (ISO):', endOfDay.toISOString());

    // Log los parámetros de búsqueda que vamos a usar
    console.log('API: Parámetros de búsqueda:', JSON.stringify({
      therapistId: session.user.id,
      date_gte: startOfDay.toISOString(),
      date_lte: endOfDay.toISOString(),
    }, null, 2));
    
    // Ejecutar la consulta corrigiendo los tipos para Prisma
    const appointments = await prisma.appointment.findMany({
      where: {
        therapistId: session.user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        // No incluir citas canceladas - usar el enum adecuado de Prisma
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        appointmentServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
    
    // Registrar resultados para depuración
    console.log(`API: Citas encontradas: ${appointments.length}`);
    
    // Mostrar detalles adicionales si hay citas
    if (appointments.length === 0) {
      console.log('API: No se encontraron citas para el fisioterapeuta en esta fecha');
      
      // Verificar si existen citas en otros días para este terapeuta
      const otherAppointments = await prisma.appointment.count({
        where: {
          therapistId: session.user.id,
          status: { not: 'CANCELLED' }
        }
      });
      console.log(`API: El fisioterapeuta tiene ${otherAppointments} citas en otros días`);
    } 
    else {
      // Mostrar detalles de la primera cita encontrada
      console.log('API: Primera cita encontrada:', JSON.stringify({
        id: appointments[0].id,
        date: appointments[0].date.toISOString(),
        status: appointments[0].status,
        patientId: appointments[0].patientId,
        therapistId: appointments[0].therapistId
      }, null, 2));
    }

    // Formatear los datos de citas para una mejor visualización
    const formattedAppointments = appointments.map(appointment => {
      return {
        id: appointment.id,
        date: appointment.date,
        status: appointment.status,
        patientName: appointment.patient.name,
        patientEmail: appointment.patient.email,
        patientPhone: appointment.patient.phone,
        services: appointment.appointmentServices.map(as => as.service.name),
      };
    });
    
    console.log(`API: Se encontraron ${formattedAppointments.length} citas para el fisioterapeuta ${session.user.id}`);

    return NextResponse.json({
      date: dateFilter,
      appointments: formattedAppointments,
      total: formattedAppointments.length,
      success: true
    }, { 
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('GET_THERAPIST_APPOINTMENTS_ERROR', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener las citas del fisioterapeuta', 
        message: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
