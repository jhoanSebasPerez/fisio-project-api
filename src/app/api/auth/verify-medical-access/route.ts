import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { logMedicalAccess, isTherapistAuthorizedForPatient, isAuthorizedForAppointment } from '@/lib/audit';

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

/**
 * Endpoint para verificar permisos de acceso a información médica confidencial
 * Este endpoint se utiliza desde el frontend para verificar si un usuario
 * tiene permisos para visualizar cierta información médica
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');
    
    // Registrar todos los intentos de verificación para auditoría
    const accessAttemptTimestamp = new Date().toISOString();
    
    // Validar parámetros
    if (!resourceType || !resourceId) {
      return NextResponse.json({
        authorized: false,
        error: 'Parámetros inválidos'
      }, { status: 400 });
    }
    
    // Verificar autenticación
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session) {
      console.log(`UNAUTHORIZED_MEDICAL_ACCESS_VERIFY: Anonymous user tried to verify access for ${resourceType}:${resourceId} at ${accessAttemptTimestamp}`);
      
      return NextResponse.json({
        authorized: false,
        error: 'No autorizado'
      }, { status: 401 });
    }
    
    // Los administradores siempre tienen acceso
    if (session.user.role === 'ADMIN') {
      // Registrar verificación de acceso de admin para auditoría
      logMedicalAccess({
        userId: session.user.id,
        accessType: 'verify',
        resourceType: resourceType as any,
        resourceId: resourceId,
        details: { 
          result: 'authorized',
          reason: 'admin_role'
        }
      });
      
      return NextResponse.json({ authorized: true });
    }
    
    let isAuthorized = false;
    let reason = '';
    
    // Verificar autorización según el tipo de recurso
    switch (resourceType) {
      case 'appointment':
        isAuthorized = await isAuthorizedForAppointment(session.user.id, session.user.role, resourceId);
        reason = isAuthorized ? 'appointment_access' : 'unauthorized_appointment';
        break;
        
      case 'patient_history':
        // Si es paciente, verificar que es su propio historial
        if (session.user.role === 'PATIENT') {
          isAuthorized = session.user.id === resourceId;
          reason = isAuthorized ? 'own_history' : 'unauthorized_patient_history';
        } 
        // Si es terapeuta, verificar que está autorizado para este paciente
        else if (session.user.role === 'THERAPIST') {
          isAuthorized = await isTherapistAuthorizedForPatient(session.user.id, resourceId);
          reason = isAuthorized ? 'therapist_patient_relationship' : 'unauthorized_therapist';
        }
        break;
        
      case 'therapist_note':
        // Solo terapeutas pueden acceder a notas, y solo a sus propias citas
        if (session.user.role === 'THERAPIST') {
          // Obtener primero la cita a la que pertenece la nota
          const note = await prisma.therapistNote.findUnique({
            where: { id: resourceId },
            select: { appointmentId: true, therapistId: true }
          });
          
          if (note) {
            // Verificar que es el autor de la nota o está asignado a esa cita
            isAuthorized = note.therapistId === session.user.id;
            reason = isAuthorized ? 'note_author' : 'unauthorized_note_access';
          }
        }
        break;
        
      default:
        reason = 'unknown_resource_type';
        break;
    }
    
    // Registrar el resultado de la verificación para auditoría
    logMedicalAccess({
      userId: session.user.id,
      accessType: 'verify',
      resourceType: resourceType as any,
      resourceId: resourceId,
      details: { 
        result: isAuthorized ? 'authorized' : 'denied',
        reason,
        userRole: session.user.role
      }
    });
    
    return NextResponse.json({ authorized: isAuthorized });
    
  } catch (error) {
    console.error('VERIFY_MEDICAL_ACCESS_ERROR', error);
    return NextResponse.json({
      authorized: false,
      error: 'Error al verificar acceso'
    }, { status: 500 });
  }
}
