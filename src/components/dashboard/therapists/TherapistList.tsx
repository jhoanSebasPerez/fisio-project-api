// src/components/dashboard/therapists/TherapistList.tsx
'use client';

import React, { useState } from 'react';
import { Therapist } from '@/types/therapist';
import { useRouter } from 'next/navigation';

import { Edit2, Power, Check, X, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Modal from '@/components/ui/modal';
import TherapistScheduleModal from './TherapistScheduleModal';

interface TherapistListProps {
  therapists: Therapist[];
  onRefresh?: () => void;
}

export default function TherapistList({ therapists, onRefresh }: TherapistListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedTherapistForSchedule, setSelectedTherapistForSchedule] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (therapists.length === 0) {
    return <p className="text-center text-gray-500 py-8">No se encontraron fisioterapeutas con los criterios seleccionados.</p>;
  }

  const handleEdit = (therapistId: string) => {
    router.push(`/dashboard/therapists/edit/${therapistId}`);
  };

  const handleDeactivate = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setIsModalOpen(true);
  };
  
  const handleShowSchedules = (therapistId: string) => {
    setSelectedTherapistForSchedule(therapistId);
    setIsScheduleModalOpen(true);
  };

  const confirmDeactivation = async () => {
    if (!selectedTherapist) return;
    setIsLoading(true);
    setError(null);
    console.log('Intentando cambiar estado del fisioterapeuta:', selectedTherapist.id);
    console.log('Estado actual:', selectedTherapist.active);

    try {
      console.log('Enviando solicitud a:', `/api/therapists/${selectedTherapist.id}/deactivate`);
      const response = await fetch(`/api/therapists/${selectedTherapist.id}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Respuesta HTTP:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en respuesta:', errorData);
        throw new Error(errorData.error || 'Error al cambiar el estado del fisioterapeuta');
      }

      // Esperar a que se complete la actualización
      const updatedTherapist = await response.json();
      console.log('Respuesta detallada del servidor:', updatedTherapist);
      console.log('¿El estado cambió?', updatedTherapist.active !== selectedTherapist.active);

      setIsModalOpen(false);

      // Mostrar notificación toast (gris para éxito)
      toast({
        title: updatedTherapist.active ? "Fisioterapeuta activado" : "Fisioterapeuta desactivado",
        description: `${updatedTherapist.name} ha sido ${updatedTherapist.active ? "activado" : "desactivado"} exitosamente.`,
        variant: "default", // Siempre gris para operaciones exitosas
      });

      // Refresh the therapists list
      console.log('Actualizando lista de fisioterapeutas...');
      if (onRefresh) {
        onRefresh();
        console.log('Lista actualizada.');
      } else {
        console.warn('No hay función onRefresh disponible');
      }
    } catch (error: any) {
      console.error('Error cambiando estado del fisioterapeuta:', error);
      setError(error.message || 'No se pudo cambiar el estado del fisioterapeuta. Inténtalo de nuevo.');

      // Mostrar notificación toast roja para error
      toast({
        title: "Error",
        description: error.message || 'No se pudo cambiar el estado del fisioterapeuta. Inténtalo de nuevo.',
        variant: "destructive", // Rojo para errores
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md mt-4">
        <table className="w-full border-collapse bg-white text-left text-sm text-gray-700">
          <thead className="bg-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-700">Nombre</th>
              <th className="px-6 py-4 font-medium text-slate-700">Email</th>
              <th className="px-6 py-4 font-medium text-slate-700">Teléfono</th>
              <th className="px-6 py-4 font-medium text-slate-700">Servicios</th>
              <th className="px-6 py-4 font-medium text-slate-700">Estado</th>
              <th className="px-6 py-4 font-medium text-slate-700 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 border-t">
            {therapists.map((therapist) => (
              <tr key={therapist.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium">{therapist.name}</td>
                <td className="px-6 py-4">{therapist.email}</td>
                <td className="px-6 py-4">{therapist.phone || '-'}</td>
                <td className="px-6 py-4">
                  {therapist.therapistServices && therapist.therapistServices.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {therapist.therapistServices.map(({ service }, index) => (
                        <span key={service.id} className="inline-block bg-slate-200 px-2 py-1 text-xs rounded">
                          {service.name}{index < therapist.therapistServices!.length - 1 ? '' : ''}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${therapist.active !== false ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                    <span className={`h-2 w-2 rounded-full ${therapist.active !== false ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    {therapist.active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 justify-center items-center">
                    <button
                      onClick={() => handleEdit(therapist.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors rounded-md font-medium text-xs"
                      title="Editar fisioterapeuta"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleShowSchedules(therapist.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors rounded-md font-medium text-xs"
                      title="Ver horarios del fisioterapeuta"
                    >
                      <Calendar size={14} />
                      <span>Horarios</span>
                    </button>
                    <button
                      onClick={() => handleDeactivate(therapist)}
                      className={`flex items-center gap-1 px-2 py-1 ${therapist.active !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} transition-colors rounded-md font-medium text-xs`}
                      title={therapist.active !== false ? 'Desactivar fisioterapeuta' : 'Activar fisioterapeuta'}
                    >
                      {therapist.active !== false ? <Power size={14} /> : <Check size={14} />}
                      <span>{therapist.active !== false ? 'Desactivar' : 'Activar'}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación */}
      {isModalOpen && selectedTherapist && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedTherapist.active !== false ? "Desactivar Fisioterapeuta" : "Activar Fisioterapeuta"}
        >
          <div className="mt-2">
            <p className="text-gray-700">
              {selectedTherapist.active !== false
                ? <>¿Estás seguro que deseas desactivar a <span className="font-bold">{selectedTherapist.name}</span>? Esta acción impedirá que el fisioterapeuta pueda gestionar citas.</>
                : <>¿Estás seguro que deseas activar a <span className="font-bold">{selectedTherapist.name}</span>? Esta acción permitirá que el fisioterapeuta pueda gestionar citas nuevamente.</>
              }
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
                {error}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                <X size={16} /> Cancelar
              </button>
              <button
                type="button"
                className={`rounded-md ${selectedTherapist.active !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-2`}
                onClick={confirmDeactivation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Procesando...
                  </>
                ) : (
                  selectedTherapist.active !== false ? <><Power size={16} /> Desactivar</> : <><Check size={16} /> Activar</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de horarios */}
      <TherapistScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        therapistId={selectedTherapistForSchedule}
      />
    </>
  );
}
