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

// PATCH para actualizar el estado de una cita
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
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

    // Obtener los datos de la solicitud
    const body = await request.json();
    const { status, therapistId } = body;

    // Validar el estado
    const validStatuses = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado de cita inválido' },
        { status: 400 }
      );
    }

    // Verificar que la cita existe
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Si es terapeuta, verificar que la cita le pertenece
    if (session.user.role === 'THERAPIST' && appointment.therapistId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tiene permisos para modificar esta cita' },
        { status: 403 }
      );
    }

    // Preparar los datos para actualizar
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Si se proporciona un estado, actualizarlo
    if (status) {
      updateData.status = status;
    }
    
    // Si se proporciona un nuevo terapista y el usuario es ADMIN, actualizarlo
    if (therapistId && session.user.role === 'ADMIN') {
      // Verificar que el terapeuta existe y está activo
      const therapist = await prisma.user.findFirst({
        where: {
          id: therapistId,
          role: 'THERAPIST',
          active: true
        }
      });
      
      if (!therapist) {
        return NextResponse.json(
          { error: 'El terapeuta seleccionado no existe o no está activo' },
          { status: 400 }
        );
      }
      
      updateData.therapistId = therapistId;
    }
    
    // Actualizar la cita
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointmentId
      },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointmentServices: {
          include: {
            service: true,
          },
        },
      }
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('UPDATE_APPOINTMENT_STATUS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado de la cita' },
      { status: 500 }
    );
  }
}

// GET para obtener una cita específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Buscar la cita
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointmentServices: {
          include: {
            service: true,
          },
        },
        therapistNotes: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos según el rol
    const userRole = session.user.role;
    const userId = session.user.id;

    // Los administradores pueden ver todas las citas
    if (userRole === 'ADMIN') {
      return NextResponse.json(appointment);
    }

    // Los terapeutas sólo pueden ver sus propias citas
    if (userRole === 'THERAPIST' && appointment.therapistId === userId) {
      return NextResponse.json(appointment);
    }

    // Los pacientes sólo pueden ver sus propias citas
    if (userRole === 'PATIENT' && appointment.patientId === userId) {
      return NextResponse.json(appointment);
    }

    // Si no cumple ninguna condición, no tiene permisos
    return NextResponse.json(
      { error: 'No tiene permisos para ver esta cita' },
      { status: 403 }
    );
  } catch (error) {
    console.error('GET_APPOINTMENT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener la cita' },
      { status: 500 }
    );
  }
}
