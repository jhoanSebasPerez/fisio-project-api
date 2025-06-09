import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getBaseUrl } from '../config';

interface SurveyEmailData {
  id: string;
  patientName: string;
  date: string | Date;
  therapistName?: string;
  services: string[];
  appointmentId: string;
}

export const generateSatisfactionSurveyEmail = (data: SurveyEmailData) => {
  const formattedDate = typeof data.date === 'string' 
    ? format(new Date(data.date), "d 'de' MMMM 'de' yyyy", { locale: es })
    : format(data.date, "d 'de' MMMM 'de' yyyy", { locale: es });
    
  const baseUrl = getBaseUrl();
  const surveyUrl = `${baseUrl}/survey/${data.appointmentId}`;
  
  const subject = `¿Cómo fue tu experiencia en tu cita de fisioterapia?`;
  
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Encuesta de satisfacción</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #4F46E5;
        color: white;
        padding: 20px;
        text-align: center;
        border-radius: 5px 5px 0 0;
      }
      .content {
        background-color: #f9f9f9;
        padding: 20px;
        border-left: 1px solid #ddd;
        border-right: 1px solid #ddd;
      }
      .footer {
        background-color: #f1f1f1;
        padding: 15px;
        text-align: center;
        font-size: 0.8em;
        color: #666;
        border-radius: 0 0 5px 5px;
        border: 1px solid #ddd;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #4F46E5;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        margin-top: 15px;
        margin-bottom: 15px;
      }
      .button:hover {
        background-color: #4338CA;
      }
      .details {
        background-color: #fff;
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>¡Gracias por tu visita!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${data.patientName}</strong>,</p>
      
      <p>Esperamos que tu reciente visita a nuestra clínica de fisioterapia haya sido satisfactoria. 
      Tu opinión es muy importante para seguir mejorando nuestros servicios.</p>
      
      <div class="details">
        <h3>Detalles de tu cita:</h3>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        ${data.therapistName ? `<p><strong>Fisioterapeuta:</strong> ${data.therapistName}</p>` : ''}
        <p><strong>Servicios:</strong> ${data.services.join(', ')}</p>
      </div>
      
      <p>¿Podrías tomarte un momento para completar nuestra breve encuesta de satisfacción? Nos tomará menos de 2 minutos.</p>
      
      <div style="text-align: center;">
        <a href="${surveyUrl}" class="button">Completar encuesta</a>
      </div>
      
      <p>Su feedback nos ayuda a mejorar constantemente y a ofrecerle el mejor servicio posible en sus próximas visitas.</p>
      
      <p>¡Gracias por confiar en nosotros para su cuidado!</p>
    </div>
    <div class="footer">
      <p>Este correo fue enviado automáticamente. Por favor no responda a este mensaje.</p>
      <p>&copy; ${new Date().getFullYear()} Clínica de Fisioterapia</p>
    </div>
  </body>
  </html>
  `;
  
  return {
    subject,
    html
  };
};
