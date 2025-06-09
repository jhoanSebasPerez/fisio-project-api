'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConfirmAppointmentPage() {
  const { id } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const confirmAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al confirmar la cita');
        }

        const data = await response.json();
        setAppointmentDetails(data.appointment);
        setStatus('success');
      } catch (error) {
        console.error('Error al confirmar la cita:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Error al confirmar la cita');
        setStatus('error');
      }
    };

    if (id) {
      confirmAppointment();
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Clínica de Fisioterapia</h1>
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline">Inicio</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <h2 className="text-xl font-semibold mt-4">Confirmando tu cita...</h2>
              <p className="text-gray-600 mt-2">Estamos procesando tu confirmación, por favor espera un momento.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-4">¡Cita Confirmada!</h2>
              <p className="text-gray-700 mb-6">
                Tu cita ha sido confirmada exitosamente. ¡Gracias por confirmar!
              </p>
              {appointmentDetails && (
                <div className="bg-gray-50 rounded-lg p-4 w-full text-left mb-6">
                  <h3 className="font-semibold text-lg mb-2">Detalles de la cita:</h3>
                  <p><span className="font-medium">Fecha:</span> {new Date(appointmentDetails.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  <p><span className="font-medium">Terapeuta:</span> {appointmentDetails.therapistName}</p>
                  <p><span className="font-medium">Servicios:</span> {appointmentDetails.services?.join(', ') || 'Fisioterapia'}</p>
                </div>
              )}
              <div className="space-y-3 w-full">
                <Link href="/">
                  <Button className="w-full">Volver al Inicio</Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-4">Error al confirmar</h2>
              <p className="text-gray-700 mb-6">
                {errorMessage || 'Ha ocurrido un error al confirmar tu cita. Por favor, contacta con la clínica.'}
              </p>
              <div className="space-y-3 w-full">
                <Link href="/">
                  <Button className="w-full">Volver al Inicio</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={() => setStatus('loading')}>
                  Reintentar
                </Button>
              </div>
            </div>
          )}
        </div>
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
              <p className="text-gray-300">Dirección: {process.env.CLINIC_ADDRESS || 'Calle 123, Ciudad, País'}</p>
              <p className="text-gray-300">Teléfono: (123) 456-7890</p>
              <p className="text-gray-300">Email: {process.env.GMAIL_USER || 'info@clinica.com'}</p>
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
