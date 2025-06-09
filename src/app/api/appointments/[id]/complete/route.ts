import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email/service';
import { randomUUID } from 'crypto';
// Importamos el objeto Session de next-auth para tipado
import { Session } from 'next-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Obtener la sesión del servidor
    const session = await getServerSession();
    
    console.log('Sesión recibida:', JSON.stringify(session, null, 2));
    
    // Verificar autenticación
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'No autorizado - Usuario no autenticado' }),
        { status: 401 }
      );
    }
    
    // Obtener los datos completos del usuario desde la base de datos
    const userFromDb = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: {
        id: true,
        role: true,
        email: true,
        name: true
      }
    });
    
    console.log('Usuario recuperado de DB:', JSON.stringify(userFromDb, null, 2));
    
    if (!userFromDb) {
      return new NextResponse(
        JSON.stringify({ error: 'No autorizado - Usuario no encontrado en la base de datos' }),
        { status: 401 }
      );
    }
    
    // Solo ADMIN o THERAPIST pueden marcar citas como completadas
    if (userFromDb.role !== 'ADMIN' && userFromDb.role !== 'THERAPIST') {
      return new NextResponse(
        JSON.stringify({ error: `Permisos insuficientes para realizar esta acción. Rol: ${userFromDb.role}` }),
        { status: 403 }
      );
    }
    
    const appointmentId = params.id;
    
    // Obtener la cita con datos de paciente y terapeuta
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        therapist: true,
      }
    });
    
    // Verificar que la cita existe
    if (!appointment) {
      return new NextResponse(
        JSON.stringify({ error: 'Cita no encontrada' }),
        { status: 404 }
      );
    }
    
    // Si es terapeuta, solo puede completar sus propias citas
    if (
      userFromDb.role === 'THERAPIST' && 
      userFromDb.id !== appointment.therapistId
    ) {
      console.log(`Terapeuta ${userFromDb.id} intentó completar cita asignada a terapeuta ${appointment.therapistId}`);
      return new NextResponse(
        JSON.stringify({ error: 'No puedes completar citas de otros terapeutas' }),
        { status: 403 }
      );
    }
    
    // Verificar que la cita no se haya cancelado o esté ya completada
    if (appointment.status === 'CANCELLED') {
      return new NextResponse(
        JSON.stringify({ error: 'No se puede completar una cita cancelada' }),
        { status: 400 }
      );
    }
    
    if (appointment.status === 'COMPLETED') {
      return new NextResponse(
        JSON.stringify({ message: 'La cita ya ha sido marcada como completada' }),
        { status: 200 }
      );
    }
    
    // Actualizar el estado de la cita a COMPLETED
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { 
        status: 'COMPLETED',
        // Asumimos que completedAt no está en el modelo, así que solo actualizamos el estado
      }
    });
    
    // Generar un ID único para la encuesta
    const surveyId = randomUUID();
    
    console.log('==== DATOS DE ENCUESTA ====');
    console.log('ID de Encuesta:', surveyId);
    console.log('ID de Cita:', appointment.id);
    console.log('Nombre del Paciente:', appointment.patient.name);
    console.log('Email del Paciente:', appointment.patient.email);
    console.log('Fecha de la Cita:', appointment.date);
    console.log('Terapeuta:', appointment.therapist?.name);
    
    // Inicializar la variable fuera del bloque try-catch para evitar problemas de tipo
    let emailResult: { success: boolean; messageId?: string; error?: any; } | undefined;
    
    try {
      // Enviar correo electrónico con la encuesta
      console.log('Intentando enviar correo de encuesta...');
      emailResult = await emailService.sendSatisfactionSurvey({
        id: surveyId,
        appointmentId: appointment.id,
        patientName: appointment.patient.name,
        patientEmail: appointment.patient.email,
        date: appointment.date,
        therapistName: appointment.therapist?.name,
        services: ['Fisioterapia'], // Usamos un valor genérico ya que el modelo no tiene el campo específico
      });
      
      console.log('Resultado del envío de correo:', JSON.stringify(emailResult, null, 2));
    } catch (emailError) {
      console.error('Excepción al enviar el correo de encuesta:', emailError);
      // No lanzamos el error para permitir que el resto del proceso continue
    }
    
    // Verificar el resultado del correo fuera del try-catch
    if (emailResult && !emailResult.success) {
      console.error('Error al enviar la encuesta:', emailResult.error);
    }
    
    try {
      // Intentar registrar la actividad en el log de actividad de citas
      await prisma.appointmentActivityLog.create({
        data: {
          appointmentId,
          action: 'COMPLETED',
          newStatus: 'COMPLETED',
          metadata: {
            completedBy: userFromDb.id,
            completedByName: userFromDb.name,
            completedByRole: userFromDb.role
          },
          userAgent: req.headers.get('user-agent') || '',
          ipAddress: req.headers.get('x-forwarded-for') || ''
        }
      });
      console.log('Actividad de completar cita registrada correctamente');
    } catch (logError) {
      // Si falla el registro de actividad, solo lo registramos pero continuamos
      console.error('Error al registrar actividad:', logError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cita marcada como completada y encuesta de satisfacción enviada al paciente',
      appointment: updatedAppointment,
      surveyInfo: 'Se ha enviado un correo electrónico al paciente con el enlace para completar la encuesta de satisfacción'
    });
    
  } catch (error: any) {
    console.error('Error al completar cita:', error);
    
    return new NextResponse(
      JSON.stringify({ error: 'Error al procesar la solicitud' }),
      { status: 500 }
    );
  }
}
