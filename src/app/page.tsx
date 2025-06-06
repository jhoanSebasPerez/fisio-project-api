import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Clínica de Fisioterapia</h1>
          <div className="space-x-2">
            <Link href="/auth/login">
              <Button variant="outline">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6 text-primary">Bienvenido a nuestro sistema de citas</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Agenda tus citas de fisioterapia de manera fácil y rápida con nuestros profesionales altamente calificados.
            </p>
            <Link href="/services">
              <Button size="lg" className="mx-2">Ver Servicios</Button>
            </Link>
            <Link href="/appointments/new">
              <Button size="lg" variant="outline" className="mx-2">Agendar Cita</Button>
            </Link>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-10 text-center">Nuestros Servicios</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-72 w-full">
                  <Image
                    src="/images/services/fisioterapia-deportiva.jpg"
                    alt="Fisioterapia Deportiva"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Fisioterapia Deportiva</h3>
                  <p className="text-gray-600 mb-4">Especializada en la recuperación y prevención de lesiones relacionadas con la actividad física.</p>
                  <Link href="/services?search=deportiva">
                    <Button variant="link">Más información</Button>
                  </Link>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-72 w-full">
                  <Image
                    src="/images/services/rehabilitacion-neurologica.jpg"
                    alt="Rehabilitación Neurológica"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Rehabilitación Neurológica</h3>
                  <p className="text-gray-600 mb-4">Tratamientos orientados a mejorar la calidad de vida en pacientes con afecciones neurológicas.</p>
                  <Link href="/services?search=neurologica">
                    <Button variant="link">Más información</Button>
                  </Link>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-72 w-full">
                  <Image
                    src="/images/services/terapia-manual.jpg"
                    alt="Terapia Manual"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-3">Terapia Manual</h3>
                  <p className="text-gray-600 mb-4">Técnicas manuales para el tratamiento del dolor y recuperación de la movilidad articular.</p>
                  <Link href="/services?search=manual">
                    <Button variant="link">Más información</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-blue-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">¿Por qué elegirnos?</h2>
            <div className="grid md:grid-cols-3 gap-8 mt-10">
              <div>
                <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Profesionales Calificados</h3>
                <p className="text-gray-600">Nuestro equipo cuenta con amplia experiencia y formación especializada.</p>
              </div>
              <div>
                <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Horarios Flexibles</h3>
                <p className="text-gray-600">Adaptamos nuestros horarios a tus necesidades para brindarte el mejor servicio.</p>
              </div>
              <div>
                <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Instalaciones Modernas</h3>
                <p className="text-gray-600">Contamos con equipamiento de última generación para tu tratamiento.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white py-8">
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
