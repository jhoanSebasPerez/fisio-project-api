import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for updating a service
const updateServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().min(1, 'La descripción es requerida').optional(),
  duration: z.number().min(1, 'La duración debe ser mayor a 0').optional(),
  price: z.number().min(0, 'El precio no puede ser negativo').optional(),
});

// GET a specific service by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const service = await prisma.service.findUnique({
      where: { id },
    });
    
    if (!service) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(service);
  } catch (error) {
    console.error('GET_SERVICE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el servicio' },
      { status: 500 }
    );
  }
}

// PATCH to update a service (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    
    // Validate request body
    const result = updateServiceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
    });
    
    if (!existingService) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }
    
    // Update service
    const updatedService = await prisma.service.update({
      where: { id },
      data: result.data,
    });
    
    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('UPDATE_SERVICE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al actualizar el servicio' },
      { status: 500 }
    );
  }
}

// API route para activar/desactivar un servicio
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const { id } = params;
    const body = await request.json();
    const { isActive } = body;
    
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo isActive es requerido y debe ser un booleano' },
        { status: 400 }
      );
    }
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
    });
    
    if (!existingService) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }
    
    // Update service active status
    const updatedService = await prisma.service.update({
      where: { id },
      data: { isActive },
    });
    
    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('TOGGLE_SERVICE_STATUS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al cambiar el estado del servicio' },
      { status: 500 }
    );
  }
}

// DELETE a service (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const { id } = params;
    
    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
    });
    
    if (!existingService) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }
    
    // Check if service is used in any appointments
    const appointmentServices = await prisma.appointmentService.findFirst({
      where: { serviceId: id },
    });
    
    if (appointmentServices) {
      // Instead of deleting, just deactivate the service
      const updatedService = await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
      
      return NextResponse.json({
        ...updatedService,
        message: 'El servicio está en uso y ha sido desactivado en lugar de eliminado'
      });
    }
    
    // Delete service if not used in appointments
    await prisma.service.delete({
      where: { id },
    });
    
    return NextResponse.json({ 
      message: 'Servicio eliminado correctamente' 
    });
  } catch (error) {
    console.error('DELETE_SERVICE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al eliminar el servicio' },
      { status: 500 }
    );
  }
}
