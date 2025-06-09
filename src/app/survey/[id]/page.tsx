'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [appointmentId] = useState<string>(params.id as string);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [appointment, setAppointment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/appointments/${appointmentId}`);
        
        // Verificar si la cita existe y está marcada como COMPLETED
        if (data.status !== 'COMPLETED') {
          setError('Esta encuesta solo está disponible para citas completadas.');
          return;
        }
        
        // Verificar si ya se respondió una encuesta para esta cita
        const checkResponse = await axios.get(`/api/survey/${appointmentId}/check`);
        if (checkResponse.data.exists) {
          setIsSubmitted(true);
          return;
        }
        
        setAppointment(data);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        setError('No se pudo cargar la información de la cita.');
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const handleRatingChange = (value: number) => {
    setRating(value);
  };

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione una calificación.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`/api/survey/${appointmentId}`, {
        satisfaction: rating,
        comments
      });

      setIsSubmitted(true);
      toast({
        title: '¡Gracias por tu feedback!',
        description: 'Tu opinión nos ayuda a mejorar nuestros servicios.'
      });
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la encuesta. Por favor intente nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <Button 
            className="mt-4" 
            variant="outline"
            onClick={() => router.push('/')}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-green-700 mb-2">¡Gracias por tu feedback!</h2>
          <p className="text-green-600 mb-4">Tu opinión es muy importante para nosotros.</p>
          <Button 
            onClick={() => router.push('/')}
          >
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-primary text-white px-6 py-8">
            <h1 className="text-3xl font-bold">Encuesta de satisfacción</h1>
            <p className="mt-2 text-primary-foreground">Tu opinión nos ayuda a mejorar</p>
          </div>
          <div className="p-6">
            {appointment && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md">
                <h2 className="font-semibold text-lg text-blue-800">Detalles de tu cita</h2>
                <div className="grid gap-2 mt-2 text-blue-900">
                  <p><span className="font-medium">Fecha:</span> {new Date(appointment.date).toLocaleDateString('es-ES', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                  })}</p>
                  {appointment.therapist && (
                    <p><span className="font-medium">Fisioterapeuta:</span> {appointment.therapist.name}</p>
                  )}
                  {appointment.services && appointment.services.length > 0 && (
                    <p><span className="font-medium">Servicios:</span> {appointment.services.map((s: any) => s.name).join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">¿Cómo calificaría su experiencia?</h3>
              <div className="flex items-center space-x-3 mb-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={`p-2 rounded-full transition-all ${rating >= value ? 'text-yellow-500 transform scale-110' : 'text-gray-300 hover:text-yellow-400'}`}
                    onClick={() => handleRatingChange(value)}
                    aria-label={`Calificar ${value} estrellas`}
                  >
                    <Star size={32} fill={rating >= value ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-sm ml-2">
                {rating === 1 && 'Insatisfecho'}
                {rating === 2 && 'Poco satisfecho'}
                {rating === 3 && 'Neutral'}
                {rating === 4 && 'Satisfecho'}
                {rating === 5 && 'Muy satisfecho'}
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">¿Desea compartir algún comentario adicional?</h3>
              <Textarea
                className="h-32"
                placeholder="Sus comentarios nos ayudan a seguir mejorando..."
                value={comments}
                onChange={handleCommentsChange}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Enviando...' : 'Enviar encuesta'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
