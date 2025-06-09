import nodemailer from 'nodemailer';
import { createTransporter, getEmailSender } from './config';
import { generateAppointmentReminderEmail } from './templates/appointment-reminder';
import { generateSatisfactionSurveyEmail } from './templates/satisfaction-survey';

interface AppointmentReminderData {
  id: string;
  patientName: string;
  patientEmail: string;
  date: Date;
  serviceName: string;
  therapistName: string;
  location: string;
}

interface SurveyData {
  id: string;
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  date: Date;
  therapistName?: string;
  services: string[];
}

export const emailService = {
  /**
   * Envía un correo de recordatorio para una cita
   */
  async sendAppointmentReminder(appointmentData: AppointmentReminderData) {
    try {
      const transporter = await createTransporter();
      
      // Generar el contenido del correo
      const { subject, html } = generateAppointmentReminderEmail({
        id: appointmentData.id,
        patientName: appointmentData.patientName,
        date: appointmentData.date,
        serviceName: appointmentData.serviceName,
        therapistName: appointmentData.therapistName,
        location: appointmentData.location
      });
      
      // Enviar el correo
      const info = await transporter.sendMail({
        from: getEmailSender(),
        to: appointmentData.patientEmail,
        subject,
        html
      });
      
      // Solo en desarrollo (ethereal.email), mostrar URL para ver el correo
      if (process.env.NODE_ENV !== 'production' && info.messageId) {
        console.log('Vista previa del correo:', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error al enviar correo de recordatorio:', error);
      return { success: false, error };
    }
  },

  /**
   * Envía una encuesta de satisfacción al finalizar una cita
   */
  async sendSatisfactionSurvey(surveyData: SurveyData) {
    try {
      console.log('Iniciando envío de encuesta de satisfacción...');
      
      if (!surveyData.patientEmail) {
        console.error('Error: No se puede enviar la encuesta sin un correo electrónico de destinatario');
        return { 
          success: false, 
          error: 'Correo electrónico del paciente no proporcionado' 
        };
      }
      
      console.log('Creando transporter para encuesta...');
      const transporter = await createTransporter();
      
      // Generar el contenido del correo
      console.log('Generando contenido de la encuesta...');
      const { subject, html } = generateSatisfactionSurveyEmail({
        id: surveyData.id,
        patientName: surveyData.patientName,
        date: surveyData.date,
        therapistName: surveyData.therapistName,
        services: surveyData.services || ['Fisioterapia'],
        appointmentId: surveyData.appointmentId
      });
      
      // Mostrar detalles del correo a enviar
      console.log(`Enviando encuesta a ${surveyData.patientEmail} para la cita ${surveyData.appointmentId}`);
      
      // Enviar el correo
      const info = await transporter.sendMail({
        from: getEmailSender(),
        to: surveyData.patientEmail,
        subject,
        html
      });
      
      // Solo en desarrollo (ethereal.email), mostrar URL para ver el correo
      if (info.messageId) {
        if (nodemailer.getTestMessageUrl && typeof nodemailer.getTestMessageUrl === 'function') {
          try {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
              console.log('Vista previa de encuesta:', previewUrl);
            }
          } catch (previewError) {
            console.log('No se pudo generar vista previa del correo, pero fue enviado correctamente');
          }
        }
        
        console.log('Encuesta enviada exitosamente con ID:', info.messageId);
      }
      
      return { 
        success: true, 
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl?.(info) : undefined,
        destinatario: surveyData.patientEmail,
        asunto: subject
      };
    } catch (error) {
      console.error('Error al enviar encuesta de satisfacción:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido al enviar la encuesta', 
        stack: error instanceof Error ? error.stack : undefined 
      };
    }
  }
};
