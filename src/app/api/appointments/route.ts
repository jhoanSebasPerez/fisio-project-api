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
      // For authenticated users
      if (!session) {
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

      // Check their availability at the requested time
      for (const therapist of availableTherapists) {
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            therapistId: therapist.therapistId,
            date: {
              // Check for overlapping appointments (30-minute buffer)
              gte: new Date(appointmentDate.getTime() - 30 * 60 * 1000),
              lte: new Date(appointmentDate.getTime() + 30 * 60 * 1000),
            },
            status: { notIn: ['CANCELLED'] },
          },
        });

        if (!existingAppointment) {
          finalTherapistId = therapist.therapistId;
          break;
        }
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
