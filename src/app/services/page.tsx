'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/services?activeOnly=true');
        setServices(response.data);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los servicios',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Clínica de Fisioterapia</h1>
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline">Inicio</Button>
            </Link>
            <Link href="/appointments/new">
              <Button>Agendar Cita</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">Nuestros Servicios</h2>
        
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div 
                key={service.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative h-72 w-full">
                  {service.imageUrl ? (
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                      <span className="text-gray-400">Imagen no disponible</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">{service.duration} minutos</span>
                    <span className="font-medium text-primary">${service.price.toFixed(2)}</span>
                  </div>
                  <p className="text-gray-700 mb-4">{service.description}</p>
                  <Link href={`/appointments/new?serviceId=${service.id}`}>
                    <Button className="w-full">Agendar cita</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && services.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl text-gray-600 mb-4">No hay servicios disponibles actualmente</h3>
            <p className="text-gray-500">Por favor, intente más tarde o contacte con la clínica</p>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Clínica de Fisioterapia</h3>
              <p className="text-gray-300">Ofreciendo servicios de calidad para mejorar tu bienestar físico.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Contacto</h3>
              <p className="text-gray-300">Dirección: Av. Principal #123</p>
              <p className="text-gray-300">Teléfono: (123) 456-7890</p>
              <p className="text-gray-300">Email: info@clinica.com</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Horarios</h3>
              <p className="text-gray-300">Lunes a Viernes: 8:00 AM - 8:00 PM</p>
              <p className="text-gray-300">Sábados: 8:00 AM - 2:00 PM</p>
              <p className="text-gray-300">Domingos: Cerrado</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center">
            <p className="text-gray-300">&copy; {new Date().getFullYear()} Clínica de Fisioterapia. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
