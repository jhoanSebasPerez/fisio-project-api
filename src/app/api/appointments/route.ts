import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendAppointmentConfirmation } from '@/lib/email';

// Extender el tipo Session para incluir los campos personalizados
interface ExtendedSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

// Interfaces para los tipos de datos
interface Patient {
  name: string;
  email: string;
  phone?: string;
}

interface AppointmentRequestBody {
  date: string;
  therapistId?: string;
  serviceIds: string[];
  patientId?: string;
  patient?: Patient;
}

// Schema for creating an appointment
const createAppointmentSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha inválida',
  }),
  therapistId: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un servicio'),
});

type AppointmentFormValues = z.infer<typeof createAppointmentSchema>;

// GET appointments
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = session.user.role;

    // Build query based on user role
    let whereClause: any = {};

    if (role === 'PATIENT') {
      // Patients can only see their own appointments
      whereClause.patientId = session.user.id;
    } else if (role === 'THERAPIST') {
      // Therapists can only see appointments assigned to them
      whereClause.therapistId = session.user.id;
    } else if (role === 'ADMIN' && userId) {
      // Admins can filter by userId if provided
      if (searchParams.get('userType') === 'therapist') {
        whereClause.therapistId = userId;
      } else {
        whereClause.patientId = userId;
      }
    }

    // Filter by date range if provided
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.date = {
        lte: new Date(endDate),
      };
    }

    // Filter by status if provided
    const status = searchParams.get('status');
    if (status) {
      whereClause.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointmentServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('GET_APPOINTMENTS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener las citas' },
      { status: 500 }
    );
  }
}

// POST a new appointment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    let patientId: string = '';

    // For public bookings, we don't require authentication
    const { searchParams } = new URL(request.url);
    const isPublicBooking = searchParams.get('public') === 'true';
    
    // En reservas públicas, no requerimos sesión de usuario
    // En reservas privadas, verificamos que haya sesión
    if (!isPublicBooking && !session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json() as AppointmentRequestBody;

    // If this is a public booking, the request should include patientId or patient information
    if (isPublicBooking) {
      if (!body.patientId && !body.patient) {
        return NextResponse.json(
          { error: 'Se requiere información del paciente' },
          { status: 400 }
        );
      }

      // If patient info is provided but not patientId, check if patient exists or create a new one
      if (!body.patientId && body.patient) {
        // First check if a user with this email already exists
        const existingUser = await prisma.user.findUnique({
          where: {
            email: body.patient.email
          }
        });

        if (existingUser) {
          // If user exists, use their ID
          patientId = existingUser.id;

          // Optionally update user information if needed
          if (body.patient.name || body.patient.phone) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: body.patient.name || existingUser.name,
                phone: body.patient.phone || existingUser.phone,
              },
            });
          }
        } else {
          // If user doesn't exist, create a new one
          const newPatient = await prisma.user.create({
            data: {
              name: body.patient.name,
              email: body.patient.email,
              phone: body.patient.phone,
              role: 'PATIENT',
            },
          });
          patientId = newPatient.id;
        }
      } else if (body.patientId) {
        patientId = body.patientId;
      } else {
        return NextResponse.json(
          { error: 'ID de paciente inválido' },
          { status: 400 }
        );
      }
    } else {
      // Para usuarios autenticados
      // Esta verificación es redundante ya que ya verificamos antes
      // pero la mantenemos por seguridad
      if (!session) {
        // Si llegamos aquí con isPublicBooking=false y sin sesión, algo está mal
        return NextResponse.json(
          { error: 'No autorizado: Sesión requerida' },
          { status: 401 }
        );
      }

      if (session.user.role === 'ADMIN' && body.patientId) {
        // Admin can create appointments for other patients
        patientId = body.patientId;
      } else if (session.user.id) {
        // Otherwise, use the current user's ID
        patientId = session.user.id;
      } else {
        return NextResponse.json(
          { error: 'No se pudo determinar el ID del paciente' },
          { status: 400 }
        );
      }
    }

    // Validate the request body
    const result = createAppointmentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { date, therapistId, serviceIds } = result.data;
    const appointmentDate = new Date(date);

    // Check if the date is in the future
    if (appointmentDate < new Date()) {
      return NextResponse.json(
        { error: 'La fecha de la cita debe ser en el futuro' },
        { status: 400 }
      );
    }

    // If therapist not specified, find an available one
    let finalTherapistId = therapistId;
    if (!finalTherapistId) {
      // Find therapists who can provide all the requested services
      const availableTherapists = await prisma.therapistService.groupBy({
        by: ['therapistId'],
        where: {
          serviceId: { in: serviceIds },
        },
        having: {
          serviceId: {
            _count: {
              equals: serviceIds.length,
            },
          },
        },
      });

      if (availableTherapists.length === 0) {
        return NextResponse.json(
          { error: 'No hay fisioterapeutas disponibles para los servicios seleccionados' },
          { status: 400 }
        );
      }

      // Obtener información sobre la carga de trabajo de cada fisioterapeuta
      // 1. Filtrar por disponibilidad en la fecha/hora requerida
      // 2. Ordenar por menor número de citas en los próximos X días
      const availableTherapistIds = availableTherapists.map(t => t.therapistId);
      
      // Primero verificamos disponibilidad en el momento exacto
      const busyTherapists = await prisma.appointment.findMany({
        where: {
          therapistId: { in: availableTherapistIds },
          date: {
            // Verificar superposición (buffer de 30 minutos)
            gte: new Date(appointmentDate.getTime() - 30 * 60 * 1000),
            lte: new Date(appointmentDate.getTime() + 30 * 60 * 1000),
          },
          status: { notIn: ['CANCELLED'] },
        },
        select: {
          therapistId: true
        }
      });
      
      // Eliminar terapeutas ocupados de la lista de disponibles
      const busyTherapistIds = busyTherapists.map(t => t.therapistId);
      const freeTherapistIds = availableTherapistIds.filter(id => !busyTherapistIds.includes(id));

      if (freeTherapistIds.length === 0) {
        return NextResponse.json(
          { error: 'No hay fisioterapeutas disponibles en la fecha y hora seleccionada' },
          { status: 400 }
        );
      }
      
      // Calcular la carga de trabajo de cada terapeuta disponible en los próximos 7 días
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // Una semana adelante
      
      const nextWeekAppointments = await prisma.appointment.groupBy({
        by: ['therapistId'],
        where: {
          therapistId: { in: freeTherapistIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: { notIn: ['CANCELLED'] },
        },
        _count: {
          id: true,
        },
      });
      
      // Crear un mapa de id terapeuta -> número de citas
      const workloadMap = new Map<string, number>();
      for (const t of nextWeekAppointments) {
        // Asegurarse de que therapistId no sea null antes de usarlo como clave
        if (t.therapistId) {
          workloadMap.set(t.therapistId, t._count.id);
        }
      }
      
      // Asignar 0 citas a los fisioterapeutas que no tienen ninguna
      for (const id of freeTherapistIds) {
        if (id && !workloadMap.has(id)) { // Verificar que id no sea null
          workloadMap.set(id, 0);
        }
      }
      
      // Ordenar terapeutas por menor carga de trabajo
      // Convertir el Map a Array para poder ordenarlo (compatible con TS sin flags especiales)
      const mapEntries: [string, number][] = []; 
      workloadMap.forEach((value, key) => {
        mapEntries.push([key, value]);
      });
      const sortedTherapists = mapEntries
        .sort((a, b) => a[1] - b[1]); // Ordenar por cantidad de citas (ascendente)
      
      if (sortedTherapists.length > 0) {
        // Asignar al fisioterapeuta con menor carga de trabajo
        finalTherapistId = sortedTherapists[0][0];
        
        // Verificar si el terapeuta tiene horario asignado para este día de la semana
        // Convertir de índice de día de JavaScript (0-6) a enum de Prisma (SUNDAY, MONDAY, etc.)
        const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayOfWeek = daysOfWeek[appointmentDate.getDay()] as any; // Casting a any para resolver incompatibilidad de tipos
        const appointmentHour = appointmentDate.getHours();
        const appointmentMinutes = appointmentDate.getMinutes();
        
        // Verificar el horario del fisioterapeuta seleccionado
        const therapistSchedule = await prisma.schedule.findFirst({
          where: {
            therapistId: finalTherapistId as string, // Asegurar que es string
            dayOfWeek,
            startTime: {
              lte: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`
            },
            endTime: {
              gte: `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinutes.toString().padStart(2, '0')}`
            }
          }
        });
        
        // Si no tiene horario para este día/hora, verificar el siguiente con menor carga
        if (!therapistSchedule && sortedTherapists.length > 1) {
          finalTherapistId = sortedTherapists[1][0];
        }
      } else {
        return NextResponse.json(
          { error: 'No se pudo determinar un fisioterapeuta disponible' },
          { status: 400 }
        );
      }
      
      if (!finalTherapistId) {
        return NextResponse.json(
          { error: 'No hay fisioterapeutas disponibles en la fecha y hora seleccionada' },
          { status: 400 }
        );
      }
    } else {
      // Check if the selected therapist can provide all the requested services
      const therapistServices = await prisma.therapistService.findMany({
        where: {
          therapistId: finalTherapistId,
          serviceId: { in: serviceIds },
        },
      });

      if (therapistServices.length !== serviceIds.length) {
        return NextResponse.json(
          { error: 'El fisioterapeuta seleccionado no puede ofrecer todos los servicios solicitados' },
          { status: 400 }
        );
      }

      // Check if the selected therapist is available at the requested time
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          therapistId: finalTherapistId,
          date: {
            // Check for overlapping appointments (30-minute buffer)
            gte: new Date(appointmentDate.getTime() - 30 * 60 * 1000),
            lte: new Date(appointmentDate.getTime() + 30 * 60 * 1000),
          },
          status: { notIn: ['CANCELLED'] },
        },
      });

      if (existingAppointment) {
        return NextResponse.json(
          { error: 'El fisioterapeuta seleccionado no está disponible en la fecha y hora seleccionada' },
          { status: 400 }
        );
      }
    }

    // Create the appointment using a transaction
    const appointment = await prisma.$transaction(async (tx: any) => {
      // Create the appointment
      const newAppointment = await tx.appointment.create({
        data: {
          patientId,
          therapistId: finalTherapistId,
          date: appointmentDate,
          status: 'SCHEDULED',
        },
      });

      // Create the appointment services
      for (const serviceId of serviceIds) {
        await tx.appointmentService.create({
          data: {
            appointmentId: newAppointment.id,
            serviceId,
          },
        });
      }

      return newAppointment;
    });

    // Get patient and therapist info for the email
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
    });

    const therapist = await prisma.user.findUnique({
      where: { id: finalTherapistId },
    });

    // Get services info
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
    });

    // Send confirmation email
    if (patient?.email) {
      await sendAppointmentConfirmation({
        to: patient.email,
        appointment: {
          id: appointment.id,
          date: appointmentDate,
          therapist: therapist?.name || 'Fisioterapeuta asignado',
          services: services.map((s: any) => s.name),
        },
        patient: {
          name: patient.name,
        },
      });
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('CREATE_APPOINTMENT_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear la cita' },
      { status: 500 }
    );
  }
}
