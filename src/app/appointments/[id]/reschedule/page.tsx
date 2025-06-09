'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Interfaz para representar una cita
interface Appointment {
  id: string;
  date: Date;
  status: string;
  serviceName?: string;
  patient?: {
    name: string;
  };
  therapist?: {
    name: string;
  };
  appointmentServices?: Array<{
    service: {
      name: string;
    };
  }>;
}

export default function RescheduleAppointmentPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { id } = params;

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${id}/public`);
        if (!response.ok) {
          throw new Error('No se pudo obtener la información de la cita');
        }
        const data = await response.json();
        setAppointment(data.appointment);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setError('No pudimos cargar los detalles de tu cita. Por favor intenta de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDate || !newTime) {
      setError('Por favor selecciona una nueva fecha y hora');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      const rescheduleDateTime = `${newDate}T${newTime}:00`;
      
      const response = await fetch(`/api/appointments/${id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newDate: rescheduleDateTime }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Update appointment with new data
        if (data.appointment) {
          setAppointment(data.appointment);
        }
      } else {
        setError(data.error || 'No se pudo reprogramar la cita');
      }
    } catch (error) {
      console.error('Error reprogramando la cita:', error);
      setError('Hubo un problema al comunicarse con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  // Get min date (today) for date picker
  const getMinDate = () => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-green-500 mb-4">
            <svg
              className="h-16 w-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">¡Cita reprogramada!</h2>
          <p className="text-gray-600 mb-6">
            Tu cita ha sido reprogramada exitosamente para el{' '}
            {appointment?.date && format(new Date(appointment.date), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-xl font-semibold text-white">Reprogramar Cita</h1>
          </div>

          <div className="p-6">
            {appointment && (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Detalles de la cita actual</h2>
                  <dl className="divide-y divide-gray-200">
                    <div className="py-2 flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Fecha y hora:</dt>
                      <dd className="text-sm text-gray-900">
                        {format(new Date(appointment.date), "d MMM yyyy, HH:mm", { locale: es })}
                      </dd>
                    </div>
                    {appointment.appointmentServices && (
                      <div className="py-2 flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Servicio:</dt>
                        <dd className="text-sm text-gray-900">
                          {appointment.appointmentServices.map(as => as.service.name).join(', ')}
                        </dd>
                      </div>
                    )}
                    {appointment.therapist && (
                      <div className="py-2 flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Terapeuta:</dt>
                        <dd className="text-sm text-gray-900">{appointment.therapist.name}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Nueva fecha
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        min={getMinDate()}
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                        Nueva hora
                      </label>
                      <input
                        type="time"
                        id="time"
                        name="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                      >
                        Cancelar
                      </Link>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none ${
                          submitting ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        {submitting ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Procesando...
                          </>
                        ) : (
                          'Reprogramar cita'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
