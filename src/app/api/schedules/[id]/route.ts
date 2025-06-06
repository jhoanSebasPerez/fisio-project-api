import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Schema for updating a schedule
const updateScheduleSchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], {
    required_error: 'El día de la semana es requerido',
  }).optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').optional(),
  isActive: z.boolean().optional(),
});

// Validador para asegurarse que endTime sea posterior a startTime
const validateTimeRange = (startTime: string, endTime: string) => {
  const start = startTime.split(':').map(Number);
  const end = endTime.split(':').map(Number);
  
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  if (startMinutes >= endMinutes) {
    throw new Error('La hora de finalización debe ser posterior a la hora de inicio');
  }
};

// GET a specific schedule by ID
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
    
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!schedule) {
      return NextResponse.json(
        { error: 'Horario no encontrado' },
        { status: 404 }
      );
    }
    
    // Si es terapeuta, solo puede ver sus propios horarios
    if (session.user.role === 'THERAPIST' && schedule.therapistId !== session.user.id) {
      return NextResponse.json(
        { error: 'No autorizado para ver este horario' },
        { status: 403 }
      );
    }
    
    // Transformar la respuesta para mantener consistencia en la API
    const { User, ...rest } = schedule;
    
    return NextResponse.json({
      ...rest,
      therapist: User
    });
  } catch (error) {
    console.error('GET_SCHEDULE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el horario' },
      { status: 500 }
    );
  }
}

// PATCH to update a schedule (admin only)
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
    const result = updateScheduleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Horario no encontrado' },
        { status: 404 }
      );
    }
    
    // Validar rango de tiempo si ambos están presentes
    if (result.data.startTime && result.data.endTime) {
      try {
        validateTimeRange(result.data.startTime, result.data.endTime);
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: 400 }
        );
      }
    } else if (result.data.startTime) {
      try {
        validateTimeRange(result.data.startTime, existingSchedule.endTime);
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: 400 }
        );
      }
    } else if (result.data.endTime) {
      try {
        validateTimeRange(existingSchedule.startTime, result.data.endTime);
      } catch (e: any) {
        return NextResponse.json(
          { error: e.message },
          { status: 400 }
        );
      }
    }
    
    // Verificar si hay solapamiento con otros horarios
    if (result.data.dayOfWeek || result.data.startTime || result.data.endTime) {
      const dayOfWeek = result.data.dayOfWeek || existingSchedule.dayOfWeek;
      const startTime = result.data.startTime || existingSchedule.startTime;
      const endTime = result.data.endTime || existingSchedule.endTime;
      
      const overlappingSchedule = await prisma.schedule.findFirst({
        where: {
          id: { not: id }, // Excluir el horario actual
          therapistId: existingSchedule.therapistId,
          dayOfWeek: dayOfWeek,
          OR: [
            {
              // Caso 1: Nuevo horario comienza durante un horario existente
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } }
              ]
            },
            {
              // Caso 2: Nuevo horario termina durante un horario existente
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } }
              ]
            },
            {
              // Caso 3: Nuevo horario engloba un horario existente
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } }
              ]
            }
          ]
        }
      });
      
      if (overlappingSchedule) {
        return NextResponse.json(
          { error: 'El horario se solapa con otro horario existente para este fisioterapeuta' },
          { status: 400 }
        );
      }
    }
    
    // Update schedule
    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: result.data,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    // Transformar la respuesta para mantener consistencia en la API
    const { User, ...rest } = updatedSchedule;
    
    return NextResponse.json({
      ...rest,
      therapist: User
    });
  } catch (error) {
    console.error('UPDATE_SCHEDULE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al actualizar el horario' },
      { status: 500 }
    );
  }
}

// DELETE a schedule (admin only)
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
    
    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
    });
    
    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Horario no encontrado' },
        { status: 404 }
      );
    }
    
    // Delete schedule
    await prisma.schedule.delete({
      where: { id },
    });
    
    return NextResponse.json({ 
      message: 'Horario eliminado correctamente' 
    });
  } catch (error) {
    console.error('DELETE_SCHEDULE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al eliminar el horario' },
      { status: 500 }
    );
  }
}
