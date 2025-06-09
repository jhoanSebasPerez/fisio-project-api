import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar autenticación y rol de administrador
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: 'No autorizado para realizar esta acción' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificar si el terapeuta existe
    const therapist = await prisma.user.findUnique({
      where: {
        id: id,
        role: Role.THERAPIST
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        role: true
      }
    });

    if (!therapist) {
      return NextResponse.json(
        { error: 'Fisioterapeuta no encontrado' },
        { status: 404 }
      );
    }

    // Cambiar el estado del terapeuta (activo/inactivo)
    const updatedTherapist = await prisma.user.update({
      where: {
        id: id
      },
      data: {
        active: !therapist.active
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        therapistServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedTherapist);

  } catch (error) {
    console.error('DEACTIVATE_THERAPIST_ERROR', error);
    return NextResponse.json(
      { error: 'Error al cambiar el estado del fisioterapeuta' },
      { status: 500 }
    );
  }
}
