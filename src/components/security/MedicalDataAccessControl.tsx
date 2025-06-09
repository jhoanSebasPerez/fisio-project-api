import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MedicalDataAccessControlProps {
  patientId?: string;
  appointmentId?: string;
  resourceType: 'appointment' | 'patient_history' | 'therapist_note';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente de seguridad para controlar acceso a datos médicos confidenciales
 * 
 * Este componente solo renderizará su contenido hijo si el usuario actual
 * tiene permisos para acceder a la información médica solicitada.
 */
export const MedicalDataAccessControl: React.FC<MedicalDataAccessControlProps> = ({
  patientId,
  appointmentId,
  resourceType,
  children,
  fallback
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      // Si el usuario no está autenticado, no tiene acceso
      if (status === 'unauthenticated') {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Si aún se está cargando la sesión, esperar
      if (status === 'loading' || !session) {
        return;
      }

      try {
        // Los administradores siempre tienen acceso (política de acceso simplificada)
        if (session.user.role === 'ADMIN') {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Para notas de terapeutas, solo terapeutas y admins pueden acceder
        if (resourceType === 'therapist_note' && session.user.role !== 'THERAPIST') {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Para historial de pacientes, verificar si es terapeuta autorizado o el propio paciente
        if (patientId && session.user.id === patientId) {
          // Es el propio paciente
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Si es terapeuta, verificar si está autorizado para este paciente/cita
        if (session.user.role === 'THERAPIST') {
          let resourceId = appointmentId;
          if (!resourceId && patientId) {
            resourceId = patientId;
          }

          if (!resourceId) {
            throw new Error('Se requiere appointmentId o patientId para verificar autorización');
          }

          // Verificar autorización con el backend
          const endpoint = `/api/auth/verify-medical-access?resourceType=${resourceType}&resourceId=${resourceId}`;
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            setIsAuthorized(data.authorized);
          } else {
            // Si el backend responde con error, considerar no autorizado
            setIsAuthorized(false);
            if (response.status !== 403) { // No mostrar error en caso de 403 (no autorizado)
              const errorData = await response.json();
              setError(errorData.error || 'Error al verificar acceso');
            }
          }
        } else {
          // Otros roles no tienen acceso (excepto admin que ya se maneja arriba)
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Error verificando acceso a datos médicos:', err);
        setError('Error al verificar permisos de acceso');
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [status, session, patientId, appointmentId, resourceType]);

  // Mientras se verifica, mostrar un spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si hay un error, mostrar alerta
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  // Si no está autorizado, mostrar mensaje o componente alternativo
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <h3 className="text-lg font-medium text-red-900 mb-2">
          Acceso restringido
        </h3>
        <p className="text-sm text-red-700">
          No tiene permisos para acceder a esta información médica confidencial.
          Solo los profesionales de la salud autorizados pueden acceder a estos datos.
        </p>
      </div>
    );
  }

  // Si está autorizado, mostrar el contenido hijo
  return <>{children}</>;
};

export default MedicalDataAccessControl;
