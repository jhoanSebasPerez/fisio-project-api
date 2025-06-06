import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all therapist-service relations or filtered by therapist
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const therapistId = searchParams.get('therapistId');
    
    let therapistServices;
    
    if (therapistId) {
      // Get services for a specific therapist
      therapistServices = await prisma.therapistService.findMany({
        where: {
          therapistId,
        },
        include: {
          service: true,
        },
      });
      
      // Return just the services
      const services = therapistServices.map((ts: { service: any }) => ts.service);
      return NextResponse.json(services);
    } else {
      // Get all therapist-service relationships
      therapistServices = await prisma.therapistService.findMany();
      return NextResponse.json(therapistServices);
    }
  } catch (error) {
    console.error('GET_THERAPIST_SERVICES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener los servicios del fisioterapeuta' },
      { status: 500 }
    );
  }
}
