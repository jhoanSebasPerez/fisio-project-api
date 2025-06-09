import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Rutas que contienen información médica confidencial
  const PROTECTED_MEDICAL_ROUTES = [
    '/api/appointments',
    '/api/patients'
  ];
  
  // Verificar si la solicitud es una reserva pública de cita o una confirmación de cita
  const isPublicAppointmentRequest = 
    request.nextUrl.pathname === '/api/appointments' && 
    request.nextUrl.searchParams.get('public') === 'true' &&
    request.method === 'POST';
    
  // Verificar si es una solicitud para confirmar una cita
  const isAppointmentConfirmRequest = 
    request.nextUrl.pathname.match(/\/api\/appointments\/[\w-]+\/confirm/) &&
    request.method === 'POST';

  // Permitir solicitudes públicas de citas y confirmaciones sin autenticación
  if (isPublicAppointmentRequest || isAppointmentConfirmRequest) {
    return NextResponse.next();
  }
  
  // Verificar si la ruta actual es una ruta médica protegida
  const isProtectedMedicalRoute = PROTECTED_MEDICAL_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route));
  
  // Solo aplicar protección especial a rutas médicas
  if (isProtectedMedicalRoute) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    // Sin token, denegar acceso
    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'No autorizado' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar rol para acceso a información médica (solo ADMIN y THERAPIST)
    const userRole = token.role as string;
    
    // Para rutas específicas con notas médicas, aplicar verificación más estricta
    if (request.nextUrl.pathname.includes('/notes') || 
        request.nextUrl.pathname.includes('/history')) {
      
      if (userRole !== 'ADMIN' && userRole !== 'THERAPIST') {
        // Auditar intento de acceso no autorizado a información médica
        console.log(`UNAUTHORIZED_MEDICAL_ACCESS: ${token.email} tried to access ${request.nextUrl.pathname}`);
        
        return new NextResponse(JSON.stringify({ 
          error: 'Acceso restringido a información médica confidencial'
        }), { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Añadir encabezados de seguridad para datos médicos
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Medical-Data-Access', 'restricted');
      
      // Solo para propósitos de auditoría
      response.headers.set('X-Access-By', token.email as string);
      
      return response;
    }
  }

  return NextResponse.next();
}

// Configurar middleware para ejecutarse solo en rutas específicas
export const config = {
  matcher: [
    '/api/appointments/:path*',
    '/api/patients/:path*'
  ],
};
