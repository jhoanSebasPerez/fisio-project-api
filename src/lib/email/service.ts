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
      // Validación de datos requeridos
      if (!appointmentData.patientEmail || !appointmentData.patientName) {
        console.error('Datos de paciente insuficientes para el correo');
        return { success: false, error: 'Datos de paciente insuficientes' };
      }

      console.log('Iniciando envío de correo a:', appointmentData.patientEmail);
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

      // Preparar datos del correo
      const mailOptions = {
        from: getEmailSender(),
        to: appointmentData.patientEmail,
        subject,
        html
      };

      console.log('Enviando correo con remitente:', mailOptions.from);

      // Enviar el correo con reintentos
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const info = await transporter.sendMail(mailOptions);
          console.log(`Correo enviado exitosamente (intento ${attempts}): ID=${info.messageId}`);

          return { success: true, messageId: info.messageId };
        } catch (err) {
          lastError = err;
          console.error(`Error al enviar correo (intento ${attempts}/${maxAttempts}):`, err);

          // Esperar antes del siguiente intento
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }

      console.error('Fallaron todos los intentos de envío de correo');
      return { success: false, error: lastError };
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

      // Validación de datos requeridos
      if (!surveyData.patientEmail || !surveyData.patientName) {
        console.error('Error: Datos insuficientes para enviar la encuesta');
        return {
          success: false,
          error: 'Datos insuficientes para enviar encuesta'
        };
      }

      console.log('Creando transporter para encuesta para:', surveyData.patientEmail);
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

      // Preparar datos del correo
      console.log(`Preparando encuesta para ${surveyData.patientEmail} (cita ${surveyData.appointmentId})`);

      const mailOptions = {
        from: getEmailSender(),
        to: surveyData.patientEmail,
        subject,
        html
      };

      console.log('Enviando correo con remitente:', mailOptions.from);

      // Enviar el correo con reintentos
      let attempts = 0;
      const maxAttempts = 3;
      let lastError;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Intento ${attempts}/${maxAttempts} para enviar encuesta a ${surveyData.patientEmail}`);

          const info = await transporter.sendMail(mailOptions);
          console.log(`Encuesta enviada correctamente (intento ${attempts}) con ID ${info.messageId}`);

          return {
            success: true,
            messageId: info.messageId,
            destinatario: surveyData.patientEmail,
            asunto: subject
          };
        } catch (err) {
          lastError = err;
          console.error(`Error al enviar encuesta (intento ${attempts}/${maxAttempts}):`, err);

          // Esperar antes del siguiente intento (espera progresiva)
          if (attempts < maxAttempts) {
            const waitTime = 1000 * attempts;
            console.log(`Esperando ${waitTime}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      console.error('Fallaron todos los intentos de envío de encuesta');
      return {
        success: false,
        error: lastError instanceof Error ? lastError.message : 'Error desconocido al enviar la encuesta'
      };
    } catch (error) {
      console.error('Error general al procesar el envío de encuesta:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al enviar la encuesta',
        stack: error instanceof Error ? error.stack : undefined
      };
    }
  }
};
