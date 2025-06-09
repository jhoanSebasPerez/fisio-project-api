import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';
import { emailService } from '@/lib/email/service';

const prisma = new PrismaClient();

// Esta función debe ser ejecutada diariamente a primera hora de la mañana
// para enviar recordatorios de las citas programadas para ese día
export async function GET(request: NextRequest) {
  try {
    // Verificar clave API secreta para asegurar que solo sistemas autorizados puedan ejecutar este cron
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener la fecha actual (inicio y fin del día)
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    
    // Buscar todas las citas programadas para hoy que estén confirmadas o agendadas
    const appointments = await prisma.appointment.findMany({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday
        },
        status: {
          in: ['CONFIRMED', 'SCHEDULED']
        }
      },
      include: {
        patient: true,
        therapist: true,
        appointmentServices: {
          include: {
            service: true
          }
        }
      }
    });
    
    // Si no hay citas para hoy, devolver mensaje informativo
    if (appointments.length === 0) {
      return NextResponse.json({ message: 'No appointments to send reminders for today' });
    }
    
    // Obtener la dirección de la clínica desde variables de entorno o usar un valor por defecto
    const clinicAddress = process.env.CLINIC_ADDRESS || 'Ubicación no especificada';
    
    // Contador de correos enviados con éxito
    let successCount = 0;
    
    // Enviar un correo de recordatorio a cada paciente
    for (const appointment of appointments) {
      // Verificar que tengamos el correo del paciente
      if (!appointment.patient?.email) {
        console.warn(`No email found for patient ID: ${appointment.patientId}`);
        continue;
      }
      
      // Obtener el nombre del primer servicio (o múltiples si hay varios)
      const serviceNames = appointment.appointmentServices.map(as => as.service.name).join(', ');
      
      try {
        // Enviar el correo de recordatorio
        const result = await emailService.sendAppointmentReminder({
          id: appointment.id,
          patientName: appointment.patient.name,
          patientEmail: appointment.patient.email,
          date: appointment.date,
          serviceName: serviceNames,
          therapistName: appointment.therapist?.name || 'Fisioterapeuta por asignar',
          location: clinicAddress
        });
        
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending reminder for appointment ID ${appointment.id}:`, error);
      }
    }
    
    // Devolver respuesta con resumen
    return NextResponse.json({ 
      message: `Processed ${appointments.length} appointments, sent ${successCount} reminder emails successfully`,
      totalAppointments: appointments.length,
      emailsSent: successCount
    });
    
  } catch (error) {
    console.error('Error processing appointment reminders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
