'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Header } from '@/components/dashboard/layout/Header';
import { Sidebar } from '@/components/dashboard/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    setMounted(true);
    
    // En pantallas pequeñas, el sidebar inicia cerrado
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Configurar al cargar
    handleResize();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Protección de ruta - redirige si no está autenticado
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      redirect('/auth/signin');
    }
  }, [status, mounted]);

  // Protección de ruta - redirige si es un paciente (no admin ni terapeuta)
  useEffect(() => {
    if (mounted && session?.user?.role === 'PATIENT') {
      redirect('/profile');
    }
  }, [session, mounted]);

  // Mostrar un estado de carga mientras verificamos la sesión
  if (status === 'loading' || !mounted) {
    return (
      <div className="flex items-center justify-center w-screen h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main 
          className={`flex-1 transition-all duration-300 p-4 md:p-6 ${
            isSidebarOpen ? "md:ml-64" : "md:ml-20"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
