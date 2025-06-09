import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET a specific therapist by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    const therapist = await prisma.user.findUnique({
      where: { 
        id,
        role: 'THERAPIST',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        therapistServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                duration: true,
                price: true,
              },
            },
          },
        },
      },
    });
    
    if (!therapist) {
      return NextResponse.json(
        { error: 'Fisioterapeuta no encontrado' },
        { status: 404 }
      );
    }

    // Transformar la respuesta para un formato más amigable
    const services = therapist.therapistServices.map(ts => ts.service);
    
    const response = {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      phone: therapist.phone,
      active: therapist.active,
      createdAt: therapist.createdAt,
      updatedAt: therapist.updatedAt,
      services: services,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET_THERAPIST_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el fisioterapeuta' },
      { status: 500 }
    );
  }
}
