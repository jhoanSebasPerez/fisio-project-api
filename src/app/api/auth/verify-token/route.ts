import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/token';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token no proporcionado' 
      }, { status: 400 });
    }
    
    // Verificar la validez del token
    const payload = verifyToken(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token inválido o expirado' 
      }, { status: 400 });
    }
    
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    // Si llegamos aquí, el token es válido
    return NextResponse.json({ 
      valid: true, 
      name: user.name,
      email: user.email
    });
    
  } catch (error) {
    console.error('ERROR_VERIFY_TOKEN:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Error al verificar el token' 
    }, { status: 500 });
  }
}
