import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Schema for creating a schedule
const createScheduleSchema = z.object({
  therapistId: z.string().min(1, 'El ID del fisioterapeuta es requerido'),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], {
    required_error: 'El día de la semana es requerido',
  }),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  serviceIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un servicio'),
  // Soporte tanto para serviceIds (array) como para serviceId (string)
  serviceId: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Validador para asegurarse que endTime sea posterior a startTime
const validateTimeRange = (data: z.infer<typeof createScheduleSchema>) => {
  const start = data.startTime.split(':').map(Number);
  const end = data.endTime.split(':').map(Number);
  
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  if (startMinutes >= endMinutes) {
    throw new Error('La hora de finalización debe ser posterior a la hora de inicio');
  }
  
  return data;
};

// GET all schedules (admin) or therapist's own schedules (therapist)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const therapistId = searchParams.get('therapistId');
    
    // Construir la query según el rol y parámetros
    let query: any = {};
    
    // Si es admin y especificó un therapistId, filtrar por ese ID
    if (session.user.role === 'ADMIN' && therapistId) {
      query.therapistId = therapistId;
    } 
    // Si es terapeuta, solo puede ver sus propios horarios
    else if (session.user.role === 'THERAPIST') {
      query.therapistId = session.user.id;
    }
    // Si es admin y no especificó therapistId, traer todos
    
    const schedules = await prisma.schedule.findMany({
      where: query,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
    
    // Transformar la respuesta para que los servicios estén directamente en el objeto schedule
    // Usando el campo metadata para obtener el serviceId asociado
    const schedulesWithServices = await Promise.all(
      schedules.map(async (schedule) => {
        // Extraer serviceId del campo metadata JSON
        const metadata = schedule.metadata ? (schedule.metadata as { serviceId?: string }) : null;
        const serviceId = metadata?.serviceId;
        
        let services: any[] = [];
        if (serviceId) {
          // Buscar el servicio por ID
          const service = await prisma.service.findUnique({
            where: { id: serviceId },
          });
          
          if (service) {
            services = [service];
          }
        }
        
        // Rename User to therapist for consistent API response
        const { User, ...rest } = schedule;
        
        return {
          ...rest,
          therapist: User,
          services,
        };
      })
    );
    
    return NextResponse.json(schedulesWithServices);
  } catch (error) {
    console.error('GET_SCHEDULES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener los horarios' },
      { status: 500 }
    );
  }
}

// POST a new schedule (admin only)
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
    const result = createScheduleSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    try {
      validateTimeRange(result.data);
    } catch (e: any) {
      return NextResponse.json(
        { error: e.message },
        { status: 400 }
      );
    }
    
    // Verificar que el terapeuta existe
    const therapist = await prisma.user.findUnique({
      where: { 
        id: result.data.therapistId,
        role: 'THERAPIST',
      },
    });
    
    if (!therapist) {
      return NextResponse.json(
        { error: 'El fisioterapeuta no existe' },
        { status: 404 }
      );
    }
    
    // Verificar si existe un horario que se solapa con el nuevo horario
    const overlappingSchedule = await prisma.schedule.findFirst({
      where: {
        therapistId: result.data.therapistId,
        dayOfWeek: result.data.dayOfWeek,
        OR: [
          {
            // Caso 1: Nuevo horario comienza durante un horario existente
            AND: [
              { startTime: { lte: result.data.startTime } },
              { endTime: { gt: result.data.startTime } }
            ]
          },
          {
            // Caso 2: Nuevo horario termina durante un horario existente
            AND: [
              { startTime: { lt: result.data.endTime } },
              { endTime: { gte: result.data.endTime } }
            ]
          },
          {
            // Caso 3: Nuevo horario engloba un horario existente
            AND: [
              { startTime: { gte: result.data.startTime } },
              { endTime: { lte: result.data.endTime } }
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
    
    // Extraer los serviceIds y serviceId del objeto de datos
    // Permitimos ambas opciones para retrocompatibilidad
    const { serviceIds, serviceId, ...scheduleData } = result.data;
    
    // Usamos serviceId individual si existe, o el primero de serviceIds
    const selectedServiceId = serviceId || (serviceIds && serviceIds.length > 0 ? serviceIds[0] : null);
    
    if (!selectedServiceId) {
      return NextResponse.json(
        { error: 'Debe proporcionar un servicio para el horario' },
        { status: 400 }
      );
    }
    
    // Obtener el servicio seleccionado para verificar su existencia y obtener su duración
    const selectedService = await prisma.service.findUnique({
      where: { id: selectedServiceId }
    });
    
    if (!selectedService) {
      return NextResponse.json(
        { error: 'El servicio seleccionado no existe' },
        { status: 400 }
      );
    }
    
    // Crear el horario
    const newSchedule = await prisma.schedule.create({
      data: {
        ...scheduleData,
        id: crypto.randomUUID(), // Generar un UUID para el ID
        updatedAt: new Date(), // Establecer updatedAt a la fecha actual
        metadata: selectedServiceId ? {
          serviceId: selectedServiceId,
        } : undefined,
      },
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
    
    // Responder con el horario creado y el servicio asociado
    // Renombramos User a therapist para mantener consistencia en la API
    const { User, ...rest } = newSchedule;
    
    const scheduleWithService = {
      ...rest,
      therapist: User,
      services: [selectedService],
    };
    
    return NextResponse.json(scheduleWithService, { status: 201 });
  } catch (error) {
    console.error('CREATE_SCHEDULE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear el horario' },
      { status: 500 }
    );
  }
}

// DELETE all schedules for a therapist (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const therapistId = searchParams.get('therapistId');
    
    if (!therapistId) {
      return NextResponse.json(
        { error: 'El ID del fisioterapeuta es requerido' },
        { status: 400 }
      );
    }
    
    // Verificar que el terapeuta existe
    const therapist = await prisma.user.findUnique({
      where: { 
        id: therapistId,
        role: 'THERAPIST',
      },
    });
    
    if (!therapist) {
      return NextResponse.json(
        { error: 'El fisioterapeuta no existe' },
        { status: 404 }
      );
    }
    
    // Eliminar todos los horarios del terapeuta
    await prisma.schedule.deleteMany({
      where: { therapistId },
    });
    
    return NextResponse.json({ message: 'Horarios eliminados correctamente' });
  } catch (error) {
    console.error('DELETE_SCHEDULES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al eliminar los horarios' },
      { status: 500 }
    );
  }
}
