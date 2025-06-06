'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppointmentConfirmationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Clínica de Fisioterapia</h1>
          <div className="space-x-2">
            <Link href="/">
              <Button variant="outline">Inicio</Button>
            </Link>
            <Link href="/services">
              <Button variant="outline">Servicios</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <div className="mb-6 text-green-500">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 mx-auto" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4">¡Cita Confirmada!</h2>
          
          <p className="text-gray-700 mb-4">
            ¡Gracias por agendar tu cita con nosotros!
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Importante:</h3>
            <p className="text-gray-700 mb-2">
              Hemos enviado un correo electrónico con todos los detalles de tu cita.
            </p>
            <p className="text-gray-700 mb-2">
              Recibirás recordatorios un día antes de tu cita para que no la olvides.
            </p>
            <p className="text-gray-700">
              Por favor, revisa tu bandeja de entrada (y carpeta de spam) para asegurarte de recibir nuestras comunicaciones.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/">
              <Button className="w-full">Volver al Inicio</Button>
            </Link>
            
            <Link href="/services">
              <Button variant="outline" className="w-full">Ver Más Servicios</Button>
            </Link>
          </div>
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
