import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos').optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { name, email, password, phone } = result.data;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        phone,
        role: 'PATIENT', // Default role is PATIENT
      },
    });
    
    // Remove hashedPassword from response
    const { hashedPassword: _, ...userWithoutPassword } = user;
    
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error('REGISTRATION_ERROR', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
