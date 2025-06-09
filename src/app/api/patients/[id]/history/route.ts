import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logMedicalAccess, isTherapistAuthorizedForPatient } from '@/lib/audit';
import { decryptMedicalData } from '@/lib/medicalDataSecurity';

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

// GET para obtener el historial completo del paciente
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    const accessAttemptTimestamp = new Date().toISOString();

    // Verificar autenticación
    if (!session) {
      // Registrar intento de acceso anónimo (posible brecha de seguridad)
      console.log(`UNAUTHORIZED_MEDICAL_ACCESS_ATTEMPT: Anonymous user tried to access patient history for patient ${patientId} at ${accessAttemptTimestamp}`);
      
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el rol es ADMIN, THERAPIST o el propio PACIENTE
    const isOwnHistory = session.user.role === 'PATIENT' && session.user.id === patientId;
    const isAuthorizedRole = session.user.role === 'ADMIN' || session.user.role === 'THERAPIST';
    
    if (!isAuthorizedRole && !isOwnHistory) {
      // Registrar intento de acceso no autorizado
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'view',
        resourceType: 'patient_history',
        resourceId: patientId,
        details: { 
          error: 'Intento de acceso no autorizado por rol', 
          role: session.user.role,
          timestamp: accessAttemptTimestamp
        }
      });
      
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a información médica confidencial' },
        { status: 403 }
      );
    }

    // Verificar que el paciente existe
    const patient = await prisma.user.findUnique({
      where: { 
        id: patientId,
        role: 'PATIENT' // Asegurarse de que es un paciente
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }
    
    // Si es terapeuta, verificar que está autorizado para ver este paciente
    if (session.user.role === 'THERAPIST') {
      const isTherapistAuthorized = await isTherapistAuthorizedForPatient(
        session.user.id,
        patientId
      );
      
      if (!isTherapistAuthorized) {
        // Registrar intento de acceso de terapeuta no autorizado
        logMedicalAccess({
          userId: session.user.id,
          accessType: 'view',
          resourceType: 'patient_history',
          resourceId: patientId,
          details: { 
            error: 'Terapeuta no autorizado para este paciente',
            patientName: patient.name
          }
        });
        
        return NextResponse.json(
          { error: 'No tiene autorización para acceder al historial de este paciente' },
          { status: 403 }
        );
      }
    }

    // Obtener todas las citas anteriores del paciente, ordenadas por fecha descendente
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
        status: 'COMPLETED', // Solo citas completadas
        date: {
          lte: new Date() // Solo citas que ya pasaron
        }
      },
      orderBy: {
        date: 'desc'
      },
      include: {
        therapist: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        appointmentServices: {
          include: {
            service: true
          }
        },
        therapistNotes: {
          include: {
            therapist: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    // Procesar las notas encriptadas si existen
    const processedAppointments = appointments.map(appointment => {
      // Clonar el objeto para no modificar el original
      const processedAppointment = { ...appointment };
      
      // Descifrar las notas médicas si están cifradas
      if (processedAppointment.therapistNotes && processedAppointment.therapistNotes.length > 0) {
        processedAppointment.therapistNotes = processedAppointment.therapistNotes.map(note => {
          // Verificar si la nota está potencialmente cifrada
          if (typeof note.content === 'string' && note.content.includes(':')) {
            try {
              // Intentar descifrar el contenido
              const decryptedContent = decryptMedicalData(note.content);
              return { ...note, content: decryptedContent };
            } catch (error) {
              console.error('Error decrypting note:', error);
              return note; // Devolver la nota original si falla el descifrado
            }
          }
          return note;
        });
      }
      
      return processedAppointment;
    });

    // Calcular estadísticas
    const totalAppointments = processedAppointments.length;
    const servicesReceived = processedAppointments.reduce((acc, appointment) => {
      appointment.appointmentServices.forEach(as => {
        if (as.service) {
          const serviceName = as.service.name;
          acc[serviceName] = (acc[serviceName] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);
    
    // Registrar acceso exitoso al historial médico
    logMedicalAccess({
      userId: session.user.id,
      accessType: 'view',
      resourceType: 'patient_history',
      resourceId: patientId,
      details: { 
        patientName: patient.name,
        appointmentCount: totalAppointments,
        role: session.user.role
      }
    });

    // Construir la respuesta
    const patientHistory = {
      patient: patient,
      statistics: {
        totalAppointments,
        servicesReceived,
        firstVisit: totalAppointments > 0 ? processedAppointments[processedAppointments.length - 1].date : null,
        lastVisit: totalAppointments > 0 ? processedAppointments[0].date : null
      },
      appointments: processedAppointments
    };
    
    // Añadir encabezados de seguridad para proteger la información médica
    const headers = new Headers();
    headers.append('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('X-Content-Type-Options', 'nosniff');
    headers.append('X-Medical-Data-Access', 'restricted');

    return NextResponse.json(patientHistory, { headers });
    
  } catch (error) {
    console.error('GET_PATIENT_HISTORY_ERROR', error);
    return NextResponse.json(
      { error: 'Error al obtener el historial del paciente' },
      { status: 500 }
    );
  }
}
