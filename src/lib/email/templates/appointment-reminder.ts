import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getBaseUrl } from '../config';

interface AppointmentDetails {
  id: string;
  patientName: string;
  date: Date;
  serviceName: string;
  therapistName: string;
  location: string;
}

export const generateAppointmentReminderEmail = (appointment: AppointmentDetails) => {
  const formattedDate = format(new Date(appointment.date), "d 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(new Date(appointment.date), "HH:mm", { locale: es });
  const baseUrl = getBaseUrl();
  
  const subject = `Recordatorio: Tu cita de fisioterapia hoy - ${formattedDate}`;
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background-color: #4F46E5;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .appointment-details {
      background-color: white;
      border-radius: 5px;
      padding: 15px;
      margin-top: 20px;
    }
    .footer {
      font-size: 12px;
      text-align: center;
      padding: 10px;
      color: #666;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
    .detail-row {
      margin-bottom: 10px;
    }
    .detail-label {
      font-weight: bold;
      width: 120px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Recordatorio de Cita</h1>
  </div>
  <div class="content">
    <p>Hola <strong>${appointment.patientName}</strong>,</p>
    <p>Te recordamos que tienes una cita de fisioterapia programada para <strong>HOY</strong>.</p>
    
    <div class="appointment-details">
      <div class="detail-row">
        <span class="detail-label">Fecha:</span> ${formattedDate}
      </div>
      <div class="detail-row">
        <span class="detail-label">Hora:</span> ${formattedTime}
      </div>
      <div class="detail-row">
        <span class="detail-label">Servicio:</span> ${appointment.serviceName}
      </div>
      <div class="detail-row">
        <span class="detail-label">Fisioterapeuta:</span> ${appointment.therapistName}
      </div>
      <div class="detail-row">
        <span class="detail-label">Ubicación:</span> ${appointment.location}
      </div>
    </div>
    
    <p>Por favor, confirma tu asistencia o reprograma tu cita si es necesario:</p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${baseUrl}/appointments/${appointment.id}/confirm" class="button" style="background-color: #10B981; margin-right: 10px;">Confirmar cita</a>
      <a href="${baseUrl}/appointments/${appointment.id}/reschedule" class="button" style="background-color: #F59E0B;">Reprogramar</a>
    </div>
    
    <p>Si no puedes asistir, por favor avísanos con al menos 3 horas de anticipación.</p>
    
    <p>¡Gracias por confiar en nuestros servicios!</p>
  </div>
  <div class="footer">
    <p>Este es un correo automático, por favor no responder.</p>
    <p>© ${new Date().getFullYear()} Centro de Fisioterapia | Todos los derechos reservados.</p>
  </div>
</body>
</html>
  `;

  return {
    subject,
    html
  };
};
