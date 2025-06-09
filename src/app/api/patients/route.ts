import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Tipos específicos para la sesión y la respuesta
type UserRole = 'ADMIN' | 'THERAPIST' | 'PATIENT';

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: UserRole;
}

interface SessionWithUser {
  user: SessionUser;
}

// GET /api/patients - recupera la lista de pacientes
export async function GET(request: Request) {
  try {
    // Obtener y validar la sesión del usuario
    const session = await getServerSession(authOptions) as SessionWithUser | null;
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }

    // Verificar roles permitidos (solo admin y terapeutas)
    const userRole = session.user.role as UserRole;
    if (userRole !== 'ADMIN' && userRole !== 'THERAPIST') {
      return NextResponse.json(
        { error: 'Acceso denegado. No tiene permisos suficientes.' },
        { status: 403 }
      );
    }

    // Obtener parámetros de la solicitud para filtrado y paginación
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const skip = (page - 1) * limit;
    const hasAppointments = searchParams.get('hasAppointments') === 'true';

    // Base de la condición WHERE para la consulta
    let whereCondition: any = { role: 'PATIENT' };
    
    // Añadir filtros de búsqueda si hay un término de búsqueda
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Ejecutar las consultas sin usar transacción para simplificar
    // Utilizando una sola conexión por consulta con ejecución eficiente

    // 1. Para terapeutas: filtrar por pacientes con citas asignadas a este terapeuta
    if (userRole === 'THERAPIST') {
      // Obtener IDs de pacientes con citas asignadas a este terapeuta
      const patientIds = await prisma.appointment
        .findMany({
          where: { therapistId: session.user.id },
          select: { patientId: true },
          distinct: ['patientId']
        })
        .then(results => results.map(a => a.patientId));
      
      // Si no hay pacientes, devolver respuesta vacía
      if (patientIds.length === 0) {
        return NextResponse.json({
          patients: [],
          pagination: { total: 0, page, limit, totalPages: 0 }
        });
      }
      
      // Añadir filtro por IDs de pacientes
      whereCondition.id = { in: patientIds };
    }
    // 2. Para administradores con filtro de citas activo
    else if (hasAppointments) {
      // Obtener IDs de pacientes con citas
      const patientIds = await prisma.appointment
        .findMany({
          select: { patientId: true },
          distinct: ['patientId']
        })
        .then(results => results.map(a => a.patientId));
      
      if (patientIds.length === 0) {
        return NextResponse.json({
          patients: [],
          pagination: { total: 0, page, limit, totalPages: 0 }
        });
      }
      
      whereCondition.id = { in: patientIds };
    }

    // 3. Realizar la consulta paginada para obtener los pacientes
    const patients = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { patientAppointments: true }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // 4. Obtener el conteo total para la paginación
    const totalCount = await prisma.user.count({
      where: whereCondition
    });

    // Formatear y devolver la respuesta
    return NextResponse.json({
      patients: patients.map(patient => ({
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || 'No disponible',
        appointmentsCount: patient._count.patientAppointments,
        createdAt: patient.createdAt
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener pacientes:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
