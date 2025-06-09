'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConfirmAppointmentPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { id } = params;

  useEffect(() => {
    const confirmAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('¡Tu cita ha sido confirmada con éxito!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Ocurrió un error al confirmar tu cita.');
        }
      } catch (error) {
        console.error('Error al confirmar la cita:', error);
        setStatus('error');
        setMessage('No se pudo conectar con el servidor. Por favor, inténtalo de nuevo más tarde.');
      }
    };

    confirmAppointment();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="text-2xl font-bold mt-4 mb-2">Procesando...</h2>
              <p className="text-gray-600">Estamos confirmando tu cita.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
                <svg
                  className="h-10 w-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-green-600">¡Confirmada!</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <p className="text-gray-600 mb-6">
                Muchas gracias por confirmar tu asistencia. Te esperamos en la clínica.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-4">
                <svg
                  className="h-10 w-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
              <p className="text-gray-600 mb-6">{message}</p>
            </>
          )}

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
