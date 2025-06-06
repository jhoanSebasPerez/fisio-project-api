'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  name: string;
}

export default function AddTherapistPage() {
  const router = useRouter();
  // Form fields states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Services states
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setServicesLoading(true);
      setServicesError(null);
      try {
        const response = await fetch('/api/services'); // Assuming this endpoint exists
        if (!response.ok) {
          throw new Error('Error al cargar los servicios');
        }
        const data = await response.json();
        setAvailableServices(data);
      } catch (err: any) {
        setServicesError(err.message || 'Ocurrió un error de red al cargar servicios.');
        console.error('Failed to fetch services:', err);
      }
      setServicesLoading(false);
    };
    fetchServices();
  }, []);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServices(prevSelectedServices =>
      prevSelectedServices.includes(serviceId)
        ? prevSelectedServices.filter(id => id !== serviceId)
        : [...prevSelectedServices, serviceId]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/therapists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, serviceIds: selectedServices }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ocurrió un error al crear el fisioterapeuta.');
      } else {
        setSuccessMessage(
          'Fisioterapeuta creado exitosamente. Se ha enviado un correo electrónico al fisioterapeuta con instrucciones para activar su cuenta.'
        );
        // Clear form
        setName('');
        setEmail('');
        setPhone('');
        setSelectedServices([]); // Clear selected services on success
        setTimeout(() => {
          router.push('/dashboard/therapists');
        }, 2000);
      }
    } catch (err) {
      setError('Ocurrió un error de red. Inténtalo de nuevo.');
      console.error('Network error:', err);
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-slate-800">Agregar Nuevo Fisioterapeuta</h1>
        <button
            type="button"
            onClick={() => router.push('/dashboard/therapists')}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
          >
            Volver al listado
          </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-8">
        {error && (
          <div className="p-3 text-red-700 bg-red-100 border border-red-400 rounded">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 text-green-700 bg-green-100 border border-green-400 rounded">
            {successMessage}
          </div>
        )}

        {/* Personal Information Section */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Información Personal</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="ej: juan.perez@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono (Opcional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                placeholder="Ej: +1 555 123 4567"
              />
            </div>
          </div>
        </section>

        {/* Password Notice Section */}
        <section>
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Credenciales de Acceso</h2>
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-700 rounded">
            <p className="font-medium">Información sobre contraseñas</p>
            <p className="mt-2">
              El sistema generará automáticamente una contraseña temporal y enviará un enlace de activación al correo electrónico del fisioterapeuta.
              El enlace tendrá una validez de 10 horas para que el fisioterapeuta pueda establecer su propia contraseña.
            </p>
          </div>
        </section>

      {/* Services Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Servicios Asignados</h2>
        {servicesLoading && <p className="text-slate-500">Cargando servicios...</p>}
        {servicesError && <p className="text-red-500">{servicesError}</p>}
        {!servicesLoading && !servicesError && availableServices.length === 0 && (
          <p className="text-slate-500">No hay servicios disponibles para asignar.</p>
        )}
        {!servicesLoading && !servicesError && availableServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableServices.map(service => (
              <div key={service.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`service-${service.id}`}
                  value={service.id}
                  checked={selectedServices.includes(service.id)}
                  onChange={() => handleServiceChange(service.id)}
                  className="h-4 w-4 text-slate-600 border-slate-300 rounded focus:ring-slate-500"
                />
                <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-slate-700">
                  {service.name}
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="flex items-center justify-end pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.push('/dashboard/therapists')}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-sm hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 mr-3"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 border border-transparent rounded-md shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600 disabled:opacity-50"
          >
            {isLoading ? 'Creando...' : 'Crear Fisioterapeuta'}
          </button>
        </div>
      </form>
    </div>
  );
}