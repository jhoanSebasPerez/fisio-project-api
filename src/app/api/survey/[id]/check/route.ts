import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Buscar si existe una encuesta para esta cita
    const surveyResponse = await prisma.surveyResponse.findFirst({
      where: {
        appointmentId,
      },
    });

    return NextResponse.json({ exists: !!surveyResponse });
  } catch (error) {
    console.error('Error al verificar encuesta:', error);
    return NextResponse.json(
      { error: 'Error al verificar encuesta' },
      { status: 500 }
    );
  }
}
