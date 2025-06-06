import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/token';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Schema para validar la solicitud
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.error.formErrors
      }, { status: 400 });
    }

    const { token, password } = validation.data;
    
    // Verificar la validez del token
    const payload = verifyToken(token);
    
    if (!payload || !payload.userId) {
      return NextResponse.json({ 
        error: 'Token inválido o expirado' 
      }, { status: 400 });
    }
    
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado' 
      }, { status: 404 });
    }
    
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Actualizar la contraseña del usuario
    await prisma.user.update({
      where: { id: payload.userId },
      data: { 
        hashedPassword,
        // Podemos añadir un campo para marcar la cuenta como activada si lo necesitamos
        // isActivated: true
      },
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
    
  } catch (error) {
    console.error('ERROR_RESET_PASSWORD:', error);
    return NextResponse.json({ 
      error: 'Error al actualizar la contraseña' 
    }, { status: 500 });
  }
}
