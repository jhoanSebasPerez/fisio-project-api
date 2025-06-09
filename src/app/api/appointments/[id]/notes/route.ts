import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logMedicalAccess, isAuthorizedForAppointment } from '@/lib/audit';
import crypto from 'crypto';

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
      // Registrar intento de acceso no autorizado
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'view',
        resourceType: 'therapist_note',
        resourceId: appointmentId,
        details: { error: 'Intento de acceso no autorizado por rol', role: session.user.role }
      });
      
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a la información médica confidencial' },
        { status: 403 }
      );
    }

    // Verificar que la cita existe
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    // Verificación avanzada de autorización
    const isAuthorized = await isAuthorizedForAppointment(
      session.user.id,
      session.user.role,
      appointmentId
    );

    if (!isAuthorized) {
      // Registrar intento de acceso no autorizado
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'view',
        resourceType: 'therapist_note',
        resourceId: appointmentId,
        details: { error: 'Usuario no autorizado para esta cita' }
      });
      
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a la información médica de este paciente' },
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

    // Registrar acceso exitoso a notas médicas
    logMedicalAccess({
      userId: session.user.id,
      accessType: 'view',
      resourceType: 'therapist_note',
      resourceId: appointmentId,
      details: {
        patientId: appointment.patientId,
        patientName: appointment.patient.name,
        noteCount: notes.length
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

    // Añadir encabezados de seguridad
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.append('X-Content-Type-Options', 'nosniff');
    headers.append('X-Medical-Data-Access', 'restricted');

    return NextResponse.json(formattedNotes, { headers });
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
      // Registrar intento de acceso no autorizado
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'create',
        resourceType: 'therapist_note',
        resourceId: appointmentId,
        details: { error: 'Rol no autorizado para crear notas', role: session.user.role }
      });
      
      return NextResponse.json(
        { error: 'Solo los terapeutas pueden añadir notas médicas confidenciales' },
        { status: 403 }
      );
    }

    const therapistId = session.user.id;

    // Verificar que la cita existe y recuperar datos del paciente para auditoría
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificación avanzada de autorización
    const isAuthorized = await isAuthorizedForAppointment(
      therapistId,
      'THERAPIST',
      appointmentId
    );

    if (!isAuthorized || appointment.therapistId !== therapistId) {
      // Registrar intento de acceso no autorizado
      logMedicalAccess({
        userId: therapistId,
        accessType: 'create',
        resourceType: 'therapist_note',
        resourceId: appointmentId,
        details: { 
          error: 'Terapeuta no autorizado para esta cita', 
          patientId: appointment.patientId 
        }
      });
      
      return NextResponse.json(
        { error: 'No tiene permisos para crear notas médicas para este paciente' },
        { status: 403 }
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
    
    // Aplicar cifrado para almacenamiento más seguro (sólo un ejemplo conceptual)
    // En un sistema real se podría implementar un sistema de cifrado más robusto
    // con claves separadas y mecanismos de descifrado seguros
    const encryptedContent = process.env.ENCRYPT_MEDICAL_DATA === 'true' 
      ? encryptMedicalData(content)
      : content;

    // Crear la nota
    const note = await prisma.therapistNote.create({
      data: {
        content: encryptedContent,
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
    
    // Registrar creación exitosa de nota médica
    logMedicalAccess({
      userId: therapistId,
      accessType: 'create',
      resourceType: 'therapist_note',
      resourceId: note.id,
      details: {
        appointmentId,
        patientId: appointment.patientId,
        patientName: appointment.patient.name,
        contentLength: content.length
      }
    });

    // Formatear la respuesta
    const formattedNote = {
      id: note.id,
      content: content, // Devolvemos el contenido original, no el cifrado
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      therapistName: note.therapist.name || 'Terapeuta',
      therapistEmail: note.therapist.email
    };

    // Añadir encabezados de seguridad
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.append('X-Content-Type-Options', 'nosniff');
    headers.append('X-Medical-Data-Access', 'restricted');

    return NextResponse.json(formattedNote, { status: 201, headers });
  } catch (error) {
    console.error('CREATE_APPOINTMENT_NOTE_ERROR', error);
    return NextResponse.json(
      { error: 'Error al crear la nota para la cita' },
      { status: 500 }
    );
  }
}

// Función para encriptar datos médicos sensibles
function encryptMedicalData(data: string): string {
  try {
    // Usar una clave de cifrado segura almacenada en variables de entorno
    const encryptionKey = process.env.MEDICAL_DATA_ENCRYPTION_KEY || 'default-key-for-development';
    
    // En producción, usar una IV única para cada encriptación
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Guardar IV junto con los datos cifrados para posibilitar el descifrado
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encrypting medical data:', error);
    return data; // Fallback to unencrypted data if encryption fails
  }
}
