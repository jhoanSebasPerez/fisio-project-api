import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth'; // Make sure this path is correct
import { Role } from '@prisma/client'; // Or your Role enum definition path
import { generateRandomPassword } from '@/lib/utils/password';
import { generateResetToken } from '@/lib/utils/token';
import { sendTherapistAccountCreation } from '@/lib/email';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const nameQuery = searchParams.get('name');
    const phoneQuery = searchParams.get('phone');

    let whereCondition: any = {
      role: 'THERAPIST',
    };

    if (nameQuery) {
      whereCondition.name = {
        contains: nameQuery,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    if (phoneQuery) {
      whereCondition.phone = {
        contains: phoneQuery,
      };
    }

    let therapists;

    if (serviceId) {
      // Get therapists who can provide a specific service
      const therapistServices = await prisma.therapistService.findMany({
        where: {
          serviceId,
          therapist: whereCondition, // Apply name/phone filters to therapists providing the service
        },
        include: {
          therapist: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              active: true,
              therapistServices: { // Include services for each therapist
                include: {
                  service: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            },
          },
        },
      });
      therapists = therapistServices.map(ts => ts.therapist);
    } else {
      // Get all therapists matching name/phone filters
      therapists = await prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          active: true,
          therapistServices: { // Include services for each therapist
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc',
        }
      });
    }

    return NextResponse.json(therapists);
  } catch (error) {
    console.error('GET_THERAPISTS_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener los fisioterapeutas' },
      { status: 500 }
    );
  }
}


// Schema for creating a therapist
const createTherapistSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('El email no es válido'),
  phone: z.string().optional(),
  serviceIds: z.array(z.string()).optional(), // Added serviceIds
  active: z.boolean().default(true), // Campo active con valor predeterminado true
});

// POST a new therapist (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createTherapistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: validation.error.formErrors }, { status: 400 });
    }

    const { name, email, phone, serviceIds, active } = validation.data;
    
    // Generar contraseña aleatoria
    const temporaryPassword = generateRandomPassword(12);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    // Hashear la contraseña generada automáticamente
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    const newTherapist = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        phone,
        role: Role.THERAPIST,
        active, // Incluir el campo active
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true, // Seleccionar el campo active
        createdAt: true,
      }
    });

    // Assign services if provided
    if (serviceIds && serviceIds.length > 0) {
      for (const serviceId of serviceIds) {
        try {
          await prisma.therapistService.create({
            data: {
              therapistId: newTherapist.id,
              serviceId: serviceId,
            },
          });
        } catch (serviceError) {
          // Log the error but don't fail the entire request if one service assignment fails
          // Alternatively, you could collect these errors and return them
          console.error(`Failed to assign service ${serviceId} to therapist ${newTherapist.id}:`, serviceError);
        }
      }
    }

    // Refetch therapist with services to return in response
    const therapistWithServices = await prisma.user.findUnique({
      where: { id: newTherapist.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true, // Incluir el campo active en la respuesta
        createdAt: true,
        therapistServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    // Generar token de activación (válido por 10 horas)
    const activationToken = generateResetToken({ userId: newTherapist.id }, '10h');
    
    // URL del enlace de activación
    const activationLink = `${process.env.NEXTAUTH_URL}/activar-cuenta/${activationToken}`;
    
    // Enviar correo electrónico con el enlace de activación
    try {
      await sendTherapistAccountCreation({
        to: email,
        therapist: { name, email },
        resetLink: activationLink
      });
    } catch (emailError) {
      console.error('Error sending activation email:', emailError);
      // No fallamos la creación del terapeuta si el email falla, pero lo registramos
    }
    
    return NextResponse.json(therapistWithServices, { status: 201 });
  } catch (error) {
    console.error('POST_THERAPIST_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear el fisioterapeuta' },
      { status: 500 }
    );
  }
}
