'use client';

import React, { useEffect, useState } from 'react';
import { Service, ServiceFiltersType } from '@/types/service';
import Modal from '@/components/ui/modal';
import { Edit2, Power, Check, X, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ServiceListProps {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  filters: ServiceFiltersType;
  onStatusToggle: (serviceId: string, isActive: boolean, serviceName: string) => void;
  onServiceDeleted: (serviceId: string, serviceName: string) => void;
  onServiceUpdated: (service: Service) => void;
}

export function ServiceList({ 
  services, 
  setServices, 
  isLoading, 
  setIsLoading, 
  filters,
  onStatusToggle,
  onServiceDeleted,
  onServiceUpdated
}: ServiceListProps) {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Para el formulario de edición
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration: 0,
    price: 0
  });

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        
        if (filters.name) {
          queryParams.append('name', filters.name);
        }
        
        queryParams.append('activeOnly', filters.activeOnly.toString());
        
        const response = await fetch(`/api/services?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al obtener los servicios');
        }
        
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios. Inténtalo de nuevo más tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [filters, setServices, setIsLoading, toast]);

  // Filtrado local de servicios por nombre
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(filters.name.toLowerCase()) &&
    (filters.activeOnly ? service.isActive : true)
  );

  const handleStatusToggle = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleDelete = (service: Service) => {
    setSelectedService(service);
    setIsDeleteModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setEditForm({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price
    });
    // Aquí se abriría un modal de edición
    // Por ahora lo dejamos pendiente
  };

  const confirmStatusToggle = async () => {
    if (!selectedService) return;
    setModalLoading(true);
    setError(null);
    
    try {
      const newStatus = !selectedService.isActive;
      console.log('Intentando cambiar estado del servicio:', selectedService.id);
      console.log('Estado actual:', selectedService.isActive);
      console.log('Nuevo estado:', newStatus);
      
      console.log('Enviando solicitud a:', `/api/services/${selectedService.id}`);
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      console.log('Respuesta HTTP:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en respuesta:', errorData);
        throw new Error(errorData.error || 'Error al cambiar el estado del servicio');
      }

      // Esperar a que se complete la actualización
      const updatedService = await response.json();
      console.log('Respuesta detallada del servidor:', updatedService);
      console.log('¿El estado cambió?', updatedService.isActive !== selectedService.isActive);
      
      setIsModalOpen(false);
      
      // Notificar al componente padre y actualizar la UI
      onStatusToggle(selectedService.id, updatedService.isActive, selectedService.name);
      
      // Mostrar notificación toast (consistente con otras partes de la aplicación)
      toast({
        title: updatedService.isActive ? "Servicio activado" : "Servicio desactivado",
        description: `El servicio ${updatedService.name} ha sido ${updatedService.isActive ? "activado" : "desactivado"} exitosamente.`,
        variant: "default", // Siempre gris para operaciones exitosas
      });
      
      console.log('UI actualizada con el nuevo estado del servicio');
    } catch (error: any) {
      console.error('Error cambiando estado del servicio:', error);
      setError(error.message || 'No se pudo cambiar el estado del servicio. Inténtalo de nuevo.');
      
      toast({
        title: "Error",
        description: error.message || 'No se pudo cambiar el estado del servicio. Inténtalo de nuevo.',
        variant: "destructive", // Rojo para errores
      });
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedService) return;
    setModalLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/services/${selectedService.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar el servicio');
      }

      const data = await response.json();
      setIsDeleteModalOpen(false);
      
      // Si el servicio se usaba en citas, solo se desactiva
      if (data.message && data.message.includes('desactivado')) {
        toast({
          title: "Servicio desactivado",
          description: "El servicio está siendo usado en citas existentes y ha sido desactivado en lugar de eliminado.",
        });
        
        // Actualizar el servicio en lugar de eliminarlo
        onServiceUpdated({
          ...selectedService,
          isActive: false
        });
      } else {
        // Notificar al componente padre que se ha eliminado
        onServiceDeleted(selectedService.id, selectedService.name);
      }
    } catch (error: any) {
      console.error('Error deleting service:', error);
      setError(error.message || 'No se pudo eliminar el servicio. Inténtalo de nuevo.');
      
      toast({
        title: "Error",
        description: error.message || 'No se pudo eliminar el servicio. Inténtalo de nuevo.',
        variant: "destructive",
      });
    } finally {
      setModalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-700"></div>
      </div>
    );
  }

  if (filteredServices.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-gray-500">No se encontraron servicios con los criterios seleccionados.</p>
        <p className="text-sm text-gray-400 mt-2">Intenta ajustar los filtros o añadir un nuevo servicio.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mt-6">
        <table className="w-full border-collapse bg-white text-left text-sm text-gray-700">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="px-6 py-3 font-medium">Nombre</th>
              <th className="px-6 py-3 font-medium">Descripción</th>
              <th className="px-6 py-3 font-medium">Duración</th>
              <th className="px-6 py-3 font-medium">Precio</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 border-t border-gray-100">
            {filteredServices.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50 border-t border-gray-100">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {service.name}
                </td>
                <td className="px-6 py-3 w-48">
                  <div className="max-w-[12rem] overflow-hidden text-ellipsis whitespace-nowrap" title={service.description}>
                    {service.description}
                  </div>
                </td>
                <td className="px-6 py-3">
                  {service.duration} min
                </td>
                <td className="px-6 py-3">
                  <span className="font-medium">${service.price.toLocaleString('es-CO')}</span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${service.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span className={`h-2 w-2 rounded-full ${service.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                    {service.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2 justify-center items-center">
                    <button
                      onClick={() => handleEdit(service)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors rounded-md font-medium text-xs"
                      title="Editar servicio"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors rounded-md font-medium text-xs"
                      title="Eliminar servicio"
                    >
                      <Trash2 size={14} />
                      <span>Eliminar</span>
                    </button>
                    <button
                      onClick={() => handleStatusToggle(service)}
                      className={`flex items-center gap-1 px-2 py-1 ${service.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} transition-colors rounded-md font-medium text-xs`}
                      title={service.isActive ? 'Desactivar servicio' : 'Activar servicio'}
                    >
                      {service.isActive ? <Power size={14} /> : <Check size={14} />}
                      <span>{service.isActive ? 'Desactivar' : 'Activar'}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación para activar/desactivar */}
      {isModalOpen && selectedService && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedService.isActive ? "Desactivar Servicio" : "Activar Servicio"}
        >
          <div className="mt-2">
            <p className="text-gray-700">
              {selectedService.isActive
                ? <>¿Estás seguro que deseas desactivar el servicio <span className="font-bold">{selectedService.name}</span>? Este servicio ya no estará disponible para nuevas citas.</>
                : <>¿Estás seguro que deseas activar el servicio <span className="font-bold">{selectedService.name}</span>? Este servicio estará disponible para nuevas citas.</>
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
                disabled={modalLoading}
              >
                <X size={16} /> Cancelar
              </button>
              <button
                type="button"
                className={`rounded-md ${selectedService.isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-2`}
                onClick={confirmStatusToggle}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Procesando...
                  </>
                ) : (
                  selectedService.isActive ? <><Power size={16} /> Desactivar</> : <><Check size={16} /> Activar</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar */}
      {isDeleteModalOpen && selectedService && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Servicio"
        >
          <div className="mt-2">
            <p className="text-gray-700">
              ¿Estás seguro que deseas eliminar el servicio <span className="font-bold">{selectedService.name}</span>? Esta acción no se puede deshacer.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Nota: Si el servicio está siendo utilizado en citas existentes, será desactivado en lugar de eliminado.
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
                className="rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm flex items-center gap-2"
                onClick={confirmDelete}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Procesando...
                  </>
                ) : (
                  <><Trash2 size={16} /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
