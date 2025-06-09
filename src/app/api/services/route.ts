import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for creating a service
const createServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  duration: z.number().min(1, 'La duración debe ser mayor a 0'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  isActive: z.boolean().default(true),
});

// GET all services
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    let whereClause = {};
    
    // If activeOnly is true or the user is not an admin, only show active services
    if (activeOnly || !session || session.user.role !== 'ADMIN') {
      whereClause = { isActive: true };
    }
    
    const services = await prisma.service.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(services);
  } catch (error) {
    console.error('GET_SERVICES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener los servicios' },
      { status: 500 }
    );
  }
}

// POST a new service (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Validate request body
    const result = createServiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { name, description, duration, price, isActive } = result.data;
    
    // Create new service
    const service = await prisma.service.create({
      data: {
        name,
        description,
        duration,
        price,
        isActive,
      },
    });
    
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('CREATE_SERVICE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear el servicio' },
      { status: 500 }
    );
  }
}
