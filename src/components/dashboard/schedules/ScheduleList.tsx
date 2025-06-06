import { useState } from 'react';
import { Edit2, Trash2, Power, Check, X, Calendar, Tag } from 'lucide-react';
import { Schedule, DayOfWeek, dayOfWeekLabels } from '@/types/schedule';
import { toast } from '@/components/ui/use-toast';
import Modal from '@/components/ui/modal';

interface ScheduleListProps {
  schedules: Schedule[];
  isLoading: boolean;
  onScheduleDeleted: () => void;
  onScheduleUpdated: (updatedSchedule: Schedule) => void;
}

export default function ScheduleList({
  schedules,
  isLoading,
  onScheduleDeleted,
  onScheduleUpdated
}: ScheduleListProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group schedules by therapist for better organization
  const schedulesByTherapist = schedules.reduce((acc, schedule) => {
    const therapistId = schedule.therapistId;
    if (!acc[therapistId]) {
      acc[therapistId] = {
        therapist: schedule.therapist!,
        schedules: []
      };
    }
    acc[therapistId].schedules.push(schedule);
    return acc;
  }, {} as Record<string, { therapist: Schedule['therapist'], schedules: Schedule[] }>);

  const handleDelete = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!selectedSchedule) return;

    setModalLoading(true);
    setError(null);

    try {
      console.log('Eliminando horario:', selectedSchedule);

      const response = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el horario');
      }

      toast({
        title: "Éxito",
        description: "Horario eliminado correctamente",
      });

      setIsDeleteModalOpen(false);
      onScheduleDeleted();
    } catch (error: any) {
      console.error('Error eliminando horario:', error);
      setError(error.message || 'No se pudo eliminar el horario. Inténtalo de nuevo.');

      toast({
        title: "Error",
        description: error.message || 'No se pudo eliminar el horario. Inténtalo de nuevo.',
        variant: "destructive",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const toggleActiveStatus = async (schedule: Schedule) => {
    try {
      console.log('Cambiando estado activo del horario:', schedule);

      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !schedule.isActive
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el estado del horario');
      }

      const updatedSchedule = await response.json();

      toast({
        title: "Éxito",
        description: `Horario ${updatedSchedule.isActive ? 'activado' : 'desactivado'} correctamente`,
      });

      onScheduleUpdated(updatedSchedule);
    } catch (error: any) {
      console.error('Error actualizando estado del horario:', error);

      toast({
        title: "Error",
        description: error.message || 'No se pudo actualizar el estado del horario. Inténtalo de nuevo.',
        variant: "destructive",
      });
    }
  };

  // Función para formatear la hora en formato de 12 horas
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (Object.keys(schedulesByTherapist).length === 0) {
    return <p className="text-center text-gray-500 py-8">No se encontraron horarios con los criterios seleccionados.</p>;
  }

  return (
    <>
      <div className="mt-4 space-y-8">
        {Object.entries(schedulesByTherapist).map(([therapistId, { therapist, schedules }]) => (
          <div key={therapistId} className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
            <div className="bg-slate-200 px-6 py-3">
              <h3 className="text-lg font-medium text-slate-700 flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                {therapist?.name || 'Terapeuta desconocido'} {therapist?.email ? `(${therapist.email})` : ''}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">Día</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">Hora</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-left">Servicio</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Estado</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedules.sort((a, b) => {
                    // Ordenar primero por día de la semana
                    const daysOrder = Object.values(DayOfWeek);
                    const dayCompare = daysOrder.indexOf(a.dayOfWeek) - daysOrder.indexOf(b.dayOfWeek);
                    if (dayCompare !== 0) return dayCompare;

                    // Si mismo día, ordenar por hora de inicio
                    return a.startTime.localeCompare(b.startTime);
                  }).map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{dayOfWeekLabels[schedule.dayOfWeek]}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {schedule.services && schedule.services.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {schedule.services.map(service => (
                              <span 
                                key={service.id} 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                title={`${service.duration} min - ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(service.price)}`}
                              >
                                <Tag size={12} className="text-blue-600" />
                                {service.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Sin servicio asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium ${schedule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          <span className={`h-2 w-2 rounded-full ${schedule.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                          {schedule.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center items-center">
                          <button
                            onClick={() => toggleActiveStatus(schedule)}
                            className={`flex items-center gap-1 px-2 py-1 ${schedule.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} transition-colors rounded-md font-medium text-xs`}
                            title={schedule.isActive ? 'Desactivar horario' : 'Activar horario'}
                          >
                            {schedule.isActive ? <Power size={14} /> : <Check size={14} />}
                            <span>{schedule.isActive ? 'Desactivar' : 'Activar'}</span>
                          </button>
                          <button
                            onClick={() => handleDelete(schedule)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors rounded-md font-medium text-xs"
                            title="Eliminar horario"
                          >
                            <Trash2 size={14} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmación para eliminar */}
      {isDeleteModalOpen && selectedSchedule && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Horario"
        >
          <div className="mt-2">
            <p className="text-gray-700">
              ¿Estás seguro que deseas eliminar este horario para el fisioterapeuta{' '}
              <span className="font-bold">{selectedSchedule.therapist?.name}</span> del{' '}
              <span className="font-bold">{dayOfWeekLabels[selectedSchedule.dayOfWeek]}</span> de{' '}
              <span className="font-bold">{formatTime(selectedSchedule.startTime)}</span> a{' '}
              <span className="font-bold">{formatTime(selectedSchedule.endTime)}</span>
              {selectedSchedule.services && selectedSchedule.services.length > 0 && (
                <>
                  {' '}para el servicio{' '}
                  <span className="font-bold">{selectedSchedule.services[0]?.name}</span>
                </>
              )}?
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
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={modalLoading}
              >
                <X size={16} /> Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 flex items-center gap-2"
                onClick={confirmDelete}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
