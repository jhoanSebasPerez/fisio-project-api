'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import WeeklyCalendar from '@/components/calendar/WeeklyCalendar';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function TherapistCalendarPage() {
  const { data: session } = useSession({ required: true });
  const router = useRouter();
  
  // Estado para modal de detalles de cita (opcional)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Manejar clic en una cita
  const handleAppointmentClick = (appointment: any) => {
    // Puedes mostrar un modal con detalles o redirigir a la página de detalles de la cita
    router.push(`/dashboard/appointments/${appointment.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Mi Calendario de Citas</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <WeeklyCalendar onAppointmentClick={handleAppointmentClick} />
        </div>
        
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h2 className="font-semibold mb-3">Leyenda</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
              <span>Programada</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
              <span>En progreso</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span>Completada</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2 opacity-60"></div>
              <span>Cancelada</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
