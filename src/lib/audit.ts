import { prisma } from '@/lib/prisma';

/**
 * Interfaz para los parámetros de registros de acceso a datos médicos
 */
interface AccessLogParams {
  userId: string;
  accessType: 'create' | 'view' | 'update' | 'delete' | 'verify';
  resourceType: 'appointment' | 'patient_data' | 'medical_note' | 'therapist_note' | 'patient_history';
  resourceId: string;
  details?: Record<string, any>;
}

/**
 * Registra un acceso a datos médicos para fines de auditoría y cumplimiento
 */
export async function logMedicalAccess(params: AccessLogParams) {
  try {
    const { userId, accessType, resourceType, resourceId, details } = params;
    
    // Aquí podríamos guardar el log en la base de datos
    // Por ahora solo imprimimos en consola para desarrollo
    console.log(`MEDICAL_ACCESS_LOG: ${accessType.toUpperCase()} ${resourceType} ${resourceId} by user ${userId}`, details || {});
    
    // En producción, esto podría guardarse en una tabla de logs o enviarse a un servicio de monitoreo
    
    return true;
  } catch (error) {
    console.error('Error logging medical access:', error);
    return false;
  }
}

/**
 * Verifica si un terapeuta está autorizado para acceder a los datos de un paciente
 * Un terapeuta está autorizado si tiene citas con ese paciente
 */
export async function isTherapistAuthorizedForPatient(
  therapistId: string,
  patientId: string
): Promise<boolean> {
  try {
    // Verificar si el terapeuta tiene alguna cita con este paciente
    const appointment = await prisma.appointment.findFirst({
      where: {
        therapistId: therapistId,
        patientId: patientId
      }
    });
    
    return !!appointment; // Devuelve true si existe alguna cita
  } catch (error) {
    console.error('Error checking therapist authorization:', error);
    return false;
  }
}

/**
 * Verifica si un usuario está autorizado para acceder a una cita específica
 * - Administradores: siempre tienen acceso
 * - Terapeutas: solo si están asignados a la cita
 * - Pacientes: solo si la cita es suya
 */
export async function isAuthorizedForAppointment(
  userId: string,
  userRole: string,
  appointmentId: string
): Promise<boolean> {
  try {
    // Si es un rol inválido, denegar acceso
    if (!['ADMIN', 'THERAPIST', 'PATIENT'].includes(userRole)) {
      return false;
    }
    
    // Administradores siempre tienen acceso
    if (userRole === 'ADMIN') {
      return true;
    }
    
    // Buscar la cita
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });
    
    if (!appointment) {
      return false; // La cita no existe
    }
    
    // Para terapeutas, verificar que están asignados a la cita
    if (userRole === 'THERAPIST') {
      return appointment.therapistId === userId;
    }
    
    // Para pacientes, verificar que la cita es suya
    if (userRole === 'PATIENT') {
      return appointment.patientId === userId;
    }
    
    return false; // Por defecto, denegar acceso
  } catch (error) {
    console.error('Error checking appointment authorization:', error);
    return false;
  }
}

// Se eliminó la implementación duplicada de isAuthorizedForAppointment
