import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// API pública para obtener detalles limitados de una cita
// Esta ruta se utiliza para los enlaces de confirmación y reprogramación en correos electrónicos
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    
    // Buscar la cita
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            name: true,
          },
        },
        therapist: {
          select: {
            name: true,
          },
        },
        appointmentServices: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Devolver solo información esencial para mostrar en la página pública
    return NextResponse.json({
      appointment: {
        id: appointment.id,
        date: appointment.date,
        status: appointment.status,
        therapist: appointment.therapist,
        appointmentServices: appointment.appointmentServices,
      },
    });
  } catch (error) {
    console.error('GET_PUBLIC_APPOINTMENT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener la cita' },
      { status: 500 }
    );
  }
}
