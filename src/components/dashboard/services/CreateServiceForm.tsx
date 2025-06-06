'use client';

import { useState } from 'react';
import { Service, CreateServiceFormData } from '@/types/service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import Modal from '@/components/ui/modal';
import { X } from 'lucide-react';

interface CreateServiceFormProps {
  onServiceCreated: (service: Service) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Schema para validación del formulario
const createServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  duration: z.coerce.number().min(1, 'La duración debe ser mayor a 0'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  isActive: z.boolean().default(true),
});

export function CreateServiceForm({ onServiceCreated, isOpen, onClose }: CreateServiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      isActive: true,
    },
  });

  const onSubmit = async (data: CreateServiceFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al crear el servicio');
      }

      const newService = await response.json();

      // Notificar al componente padre
      onServiceCreated(newService);

      // Resetear el formulario
      reset();
      
      // Cerrar el modal
      onClose();
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast({
        title: "Error",
        description: error.message || 'No se pudo crear el servicio. Inténtalo de nuevo.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Servicio"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre del Servicio <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register('name')}
            className={`block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4 ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Ej: Masaje Terapéutico"
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className={`block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4 ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Breve descripción del servicio..."
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="duration" className="block text-sm font-semibold text-gray-700 mb-2">
              Duración (minutos) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="duration"
              min="5"
              step="5"
              {...register('duration', {
                valueAsNumber: true,
              })}
              className={`block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4 ${errors.duration ? 'border-red-500' : ''}`}
              placeholder="60"
            />
            {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration.message}</p>}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
              Precio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                {...register('price', {
                  valueAsNumber: true,
                })}
                className={`pl-8 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-3 px-4 ${errors.price ? 'border-red-500' : ''}`}
                placeholder="50000"
              />
            </div>
            {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 block text-sm font-medium text-gray-700">Servicio Activo</span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-7">Los servicios inactivos no se mostrarán en la agenda</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={onClose}
            disabled={isLoading}
          >
            <X size={16} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Guardando...
              </>
            ) : (
              'Guardar Servicio'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
