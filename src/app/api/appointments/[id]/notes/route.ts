import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

// GET para obtener todas las notas de una cita
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el rol es ADMIN o THERAPIST
    if (session.user.role !== 'ADMIN' && session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a las notas' },
        { status: 403 }
      );
    }

    // Verificar que la cita existe
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Si es terapeuta, verificar que la cita le pertenece
    if (session.user.role === 'THERAPIST' && appointment.therapistId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a las notas de esta cita' },
        { status: 403 }
      );
    }

    // Obtener las notas con información del terapeuta
    const notes = await prisma.therapistNote.findMany({
      where: {
        appointmentId: appointmentId
      },
      include: {
        therapist: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formatear las notas para la respuesta
    const formattedNotes = notes.map(note => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      therapistName: note.therapist.name || 'Terapeuta',
      therapistEmail: note.therapist.email
    }));

    return NextResponse.json(formattedNotes);
  } catch (error) {
    console.error('GET_APPOINTMENT_NOTES_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener las notas de la cita' },
      { status: 500 }
    );
  }
}

// POST para crear una nueva nota para una cita
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Solo los terapeutas pueden añadir notas
    if (session.user.role !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Solo los terapeutas pueden añadir notas a las citas' },
        { status: 403 }
      );
    }

    const therapistId = session.user.id;

    // Verificar que la cita existe y pertenece al terapeuta
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        therapistId: therapistId // Solo puede añadir notas a sus citas
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada o no está asignada a este terapeuta' },
        { status: 404 }
      );
    }

    // Obtener el contenido de la nota del cuerpo de la solicitud
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'El contenido de la nota no puede estar vacío' },
        { status: 400 }
      );
    }

    // Crear la nota
    const note = await prisma.therapistNote.create({
      data: {
        content,
        appointmentId,
        therapistId
      },
      include: {
        therapist: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Formatear la respuesta
    const formattedNote = {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      therapistName: note.therapist.name || 'Terapeuta',
      therapistEmail: note.therapist.email
    };

    return NextResponse.json(formattedNote, { status: 201 });
  } catch (error) {
    console.error('CREATE_APPOINTMENT_NOTE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear la nota para la cita' },
      { status: 500 }
    );
  }
}
