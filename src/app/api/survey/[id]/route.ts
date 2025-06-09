import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const { satisfaction, comments } = await request.json();
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Se requiere ID de cita' },
        { status: 400 }
      );
    }

    if (!satisfaction || satisfaction < 1 || satisfaction > 5) {
      return NextResponse.json(
        { error: 'Se requiere calificación válida (1-5)' },
        { status: 400 }
      );
    }

    // Verificar si la cita existe y está completada
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        patient: true,
        therapist: true,
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    if (appointment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Solo se pueden evaluar citas completadas' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una encuesta para esta cita
    const existingSurvey = await prisma.surveyResponse.findFirst({
      where: {
        appointmentId,
      },
    });

    if (existingSurvey) {
      return NextResponse.json(
        { error: 'Ya existe una encuesta para esta cita' },
        { status: 409 }
      );
    }

    // Crear la respuesta de la encuesta
    const surveyResponse = await prisma.surveyResponse.create({
      data: {
        satisfaction,
        comments: comments || '',
        appointmentId,
        patientId: appointment.patientId, // Agregar patientId requerido
      },
    });

    // Registrar en el log de actividad
    await prisma.appointmentActivityLog.create({
      data: {
        appointmentId,
        action: 'SURVEY_SUBMITTED',
        newStatus: 'COMPLETED', // Campo requerido según el modelo
        metadata: {
          satisfaction,
          surveyId: surveyResponse.id,
        },
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || '',
      },
    });

    return NextResponse.json({ 
      success: true, 
      surveyId: surveyResponse.id 
    });
  } catch (error) {
    console.error('Error al guardar encuesta:', error);
    return NextResponse.json(
      { error: 'Error al guardar la encuesta' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Se requiere ID de cita' },
        { status: 400 }
      );
    }

    // Obtener la encuesta para esta cita
    const surveyResponse = await prisma.surveyResponse.findFirst({
      where: {
        appointmentId,
      },
    });

    if (!surveyResponse) {
      return NextResponse.json(
        { error: 'No se encontró encuesta para esta cita' },
        { status: 404 }
      );
    }

    return NextResponse.json(surveyResponse);
  } catch (error) {
    console.error('Error al obtener encuesta:', error);
    return NextResponse.json(
      { error: 'Error al obtener la encuesta' },
      { status: 500 }
    );
  }
}
