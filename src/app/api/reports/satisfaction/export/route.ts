import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

interface ExtendedSession {
  user: {
    id: string;
    role: 'ADMIN' | 'THERAPIST' | 'PATIENT';
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession | null;

    // Verificar autenticación y permisos
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para exportar esta información' },
        { status: 403 }
      );
    }

    // Obtener parámetros de la solicitud
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    const therapistId = url.searchParams.get('therapistId') || undefined;
    
    // Establecer fechas por defecto si no se proporcionan
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    
    // Por defecto, 3 meses atrás si no se proporciona fecha de inicio
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);

    // Construir la consulta
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      appointment: {
        status: 'COMPLETED'
      }
    };

    // Filtrar por terapeuta si se proporciona ID
    if (therapistId) {
      whereClause.appointment = {
        ...whereClause.appointment,
        therapistId
      };
    }

    // Obtener todas las encuestas en el período con detalles
    const surveys = await prisma.surveyResponse.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            patient: true,
            therapist: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Verificar si hay encuestas
    if (surveys.length === 0) {
      return NextResponse.json(
        { message: 'No hay encuestas disponibles para exportar en el período seleccionado.' },
        { status: 404 }
      );
    }
    
    // Transformar datos para CSV con typecasting para evitar problemas de tipo
    const csvData = surveys.map(survey => {
      const appointment = survey.appointment as any; // Usar any para evitar problemas de tipo
      const appointmentDate = new Date(appointment.date);
      const surveyDate = new Date(survey.createdAt);
      
      return {
        'ID Encuesta': survey.id,
        'Fecha Encuesta': format(surveyDate, 'yyyy-MM-dd HH:mm:ss'),
        'Calificación': survey.satisfaction,
        'Comentarios': survey.comments || '',
        'ID Cita': survey.appointmentId,
        'Fecha Cita': format(appointmentDate, 'yyyy-MM-dd HH:mm:ss'),
        'Servicio': appointment.service || 'No especificado',
        'ID Paciente': appointment.patient?.id || '',
        'Paciente': appointment.patient?.name || 'Desconocido',
        'Email Paciente': appointment.patient?.email || '',
        'ID Terapeuta': appointment.therapist?.id || '',
        'Terapeuta': appointment.therapist?.name || 'Desconocido',
        'Email Terapeuta': appointment.therapist?.email || ''
      };
    });
    
    // Generar CSV
    const headers = Object.keys(csvData[0] || {});
    const csvRows = [
      headers.join(','), // Cabecera
      ...csvData.map(row => 
        headers.map(header => {
          // Escapar comillas y añadir comillas alrededor del valor
          const value = String(row[header as keyof typeof row]);
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');
    
    // Nombre del archivo
    const fileName = `encuestas_satisfaccion_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;
    
    // Devolver respuesta CSV
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=${fileName}`
      }
    });
  } catch (error) {
    console.error('Error al exportar encuestas:', error);
    return NextResponse.json(
      { error: 'Error al exportar los datos de encuestas' },
      { status: 500 }
    );
  }
}
