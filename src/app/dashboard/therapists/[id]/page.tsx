'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Schedule, ScheduleFilters } from '@/types/schedule';
import { Therapist } from '@/types/therapist';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import ScheduleList from '@/components/dashboard/schedules/ScheduleList';
import CreateScheduleForm from '@/components/dashboard/schedules/CreateScheduleForm';
import Link from 'next/link';

interface TherapistDetailPageProps {
  params: {
    id: string;
  };
}

export default function TherapistDetailPage({ params }: TherapistDetailPageProps) {
  const { id } = params;
  const router = useRouter();
  const { toast } = useToast();
  
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Cargar datos del fisioterapeuta
  useEffect(() => {
    const fetchTherapist = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/therapists/${id}`);
        if (response.status === 404) {
          toast({
            title: "Error",
            description: "Fisioterapeuta no encontrado",
            variant: "destructive",
          });
          router.push('/dashboard/therapists');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Error al cargar los datos del fisioterapeuta');
        }
        
        const data = await response.json();
        setTherapist(data);
      } catch (error: any) {
        console.error('Error cargando fisioterapeuta:', error);
        toast({
          title: "Error",
          description: error.message || 'No se pudo cargar el fisioterapeuta',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTherapist();
  }, [id, router]);

  // Cargar horarios del fisioterapeuta
  const fetchSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const response = await fetch(`/api/schedules?therapistId=${id}`);
      if (!response.ok) {
        throw new Error('Error al cargar los horarios del fisioterapeuta');
      }
      
      const data = await response.json();
      setSchedules(data);
    } catch (error: any) {
      console.error('Error cargando horarios:', error);
      toast({
        title: "Error",
        description: error.message || 'No se pudieron cargar los horarios',
        variant: "destructive",
      });
      setSchedules([]);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchSchedules();
    }
  }, [id]);

  const handleScheduleCreated = () => {
    fetchSchedules();
    toast({
      title: "Éxito",
      description: "Horario creado correctamente",
    });
  };

  const handleScheduleDeleted = () => {
    fetchSchedules();
  };

  const handleScheduleUpdated = (updatedSchedule: Schedule) => {
    setSchedules(prevSchedules => 
      prevSchedules.map(schedule => 
        schedule.id === updatedSchedule.id ? updatedSchedule : schedule
      )
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          No se pudo cargar el fisioterapeuta. Por favor, intente nuevamente.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/dashboard/therapists" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="mr-2" size={18} />
          Volver a la lista
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="bg-slate-800 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="bg-white rounded-full p-3 mr-4">
                <User className="h-10 w-10 text-slate-800" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{therapist.name}</h1>
                <p className="text-slate-300">{therapist.email}</p>
                {therapist.phone && <p className="text-slate-300">Tel: {therapist.phone}</p>}
              </div>
            </div>
            <div className="flex space-x-2">
              <Link 
                href={`/dashboard/therapists/edit/${therapist.id}`} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Editar Información
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold flex items-center mb-4">
              <Calendar className="mr-2 h-5 w-5 text-blue-600" />
              Horarios Asignados
            </h2>
            <p className="text-gray-600 mb-6">
              Estos son los horarios en los que el fisioterapeuta atiende a los pacientes.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ScheduleList 
                  schedules={schedules}
                  isLoading={isLoadingSchedules}
                  onScheduleDeleted={handleScheduleDeleted}
                  onScheduleUpdated={handleScheduleUpdated}
                />
              </div>

              <div>
                <CreateScheduleForm 
                  onScheduleCreated={handleScheduleCreated}
                  therapistId={id}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
