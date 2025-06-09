import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API para reprogramar una cita
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const data = await request.json();
    const { newDate } = data;
    
    if (!newDate) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una nueva fecha para reprogramar' },
        { status: 400 }
      );
    }
    
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

    // Verificar que la cita no está cancelada o ya completada
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta cita no puede ser reprogramada porque ha sido cancelada o ya fue completada',
        },
        { status: 400 }
      );
    }

    // Obtener información del cliente para el registro
    const userAgent = request.headers.get('user-agent') || 'No disponible';
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'No disponible';
    
    // Parsear la nueva fecha
    const parsedNewDate = new Date(newDate);
    
    // Realizar la transacción para actualizar la cita y registrar la actividad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la fecha de la cita y cambiar estado a reprogramada
      const updatedAppointment = await tx.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          date: parsedNewDate,
          status: 'RESCHEDULED',
        },
      });
      
      // 2. Registrar la actividad en el log
      const activityLog = await tx.appointmentActivityLog.create({
        data: {
          appointmentId,
          action: 'RESCHEDULED',
          previousStatus: appointment.status,
          newStatus: 'RESCHEDULED',
          previousDate: appointment.date, // Guardar la fecha anterior
          newDate: parsedNewDate,        // Guardar la nueva fecha
          metadata: {
            method: 'email_link',
            source: 'appointment_reminder_email',
            reason: data.reason || null,  // Por si el usuario proporciona una razón
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
    console.error('Error al reprogramar la cita:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
