import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API para confirmar una cita usando un token de acceso
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    
    // Verificar que la cita existe
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la cita está en un estado que permite confirmación
    // (no cancelada, no completada)
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta cita no puede ser confirmada porque ha sido cancelada o ya fue completada',
        },
        { status: 400 }
      );
    }

    // Obtener información del cliente para el registro
    const userAgent = request.headers.get('user-agent') || 'No disponible';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'No disponible';
    
    // Realizar la transacción para actualizar la cita y registrar la actividad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el estado de la cita a confirmada
      const updatedAppointment = await tx.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status: 'CONFIRMED',
        },
      });
      
      // 2. Registrar la actividad en el log
      const activityLog = await tx.appointmentActivityLog.create({
        data: {
          appointmentId,
          action: 'CONFIRMED',
          previousStatus: appointment.status,
          newStatus: 'CONFIRMED',
          metadata: {
            method: 'email_link',
            source: 'appointment_reminder_email',
          },
          ipAddress,
          userAgent,
        }
      });
      
      return { updatedAppointment, activityLog };
    });

    return NextResponse.json({
      success: true,
      appointment: result.updatedAppointment,
      log: { id: result.activityLog.id, createdAt: result.activityLog.createdAt },
    });
  } catch (error) {
    console.error('Error al confirmar la cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
