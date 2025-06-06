import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface AppointmentDetails {
  id: string;
  date: Date;
  therapist: string;
  services: string[];
}

interface PatientDetails {
  name: string;
}

interface TherapistDetails {
  name: string;
  email: string;
}

interface EmailOptions {
  to: string;
  appointment: AppointmentDetails;
  patient: PatientDetails;
}

interface TherapistEmailOptions {
  to: string;
  therapist: TherapistDetails;
  resetLink: string;
}

// Function to send therapist account creation email
export async function sendTherapistAccountCreation({ to, therapist, resetLink }: TherapistEmailOptions) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Bienvenido(a) a la Clínica de Fisioterapia</h2>
      <p>Hola ${therapist.name},</p>
      <p>Se ha creado una cuenta para ti en nuestro sistema de gestión de fisioterapeutas.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Correo electrónico:</strong> ${therapist.email}</p>
        <p>Se ha generado una contraseña temporal para tu cuenta. Para finalizar el proceso de activación y establecer tu propia contraseña, por favor haz clic en el siguiente enlace:</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Activar mi cuenta</a>
      </div>
      
      <p>Este enlace será válido por las próximas 10 horas. Si no completas el proceso de activación en este tiempo, deberás solicitar un nuevo enlace de activación.</p>
      
      <p style="color: #777; font-size: 0.9em;">Si no esperabas este correo o crees que ha sido enviado por error, por favor ignóralo o contáctanos para más información.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 0.8em;">
        <p>© ${new Date().getFullYear()} Clínica de Fisioterapia. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Activación de Cuenta - Clínica de Fisioterapia',
      html,
    });

    console.log(`Therapist account creation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending therapist account creation email:', error);
    return { success: false, error };
  }
}

// Function to send appointment confirmation email
export async function sendAppointmentConfirmation({ to, appointment, patient }: EmailOptions) {
  const date = format(appointment.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const time = format(appointment.date, "h:mm a", { locale: es });

  const confirmationUrl = `${process.env.NEXTAUTH_URL}/appointments/confirm/${appointment.id}`;
  const rescheduleUrl = `${process.env.NEXTAUTH_URL}/appointments/reschedule/${appointment.id}`;

  const services = appointment.services.join(', ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Confirmación de Cita</h2>
      <p>Hola ${patient.name},</p>
      <p>Tu cita ha sido agendada exitosamente con los siguientes detalles:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${date}</p>
        <p><strong>Hora:</strong> ${time}</p>
        <p><strong>Fisioterapeuta:</strong> ${appointment.therapist}</p>
        <p><strong>Servicios:</strong> ${services}</p>
        <p><strong>Ubicación:</strong> Clínica de Fisioterapia, Av. Principal #123</p>
      </div>
      
      <p>Por favor confirma tu asistencia haciendo clic en el siguiente botón:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Confirmar Cita</a>
      </div>
      
      <p>Si necesitas reprogramar tu cita, puedes hacerlo aquí:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${rescheduleUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reprogramar Cita</a>
      </div>
      
      <p style="color: #777; font-size: 0.9em;">Si tienes alguna pregunta o necesitas ayuda, por favor contáctanos al (123) 456-7890 o responde a este correo.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 0.8em;">
        <p>© ${new Date().getFullYear()} Clínica de Fisioterapia. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Confirmación de Cita - Clínica de Fisioterapia',
      html,
    });

    console.log(`Confirmation email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error };
  }
}

// Function to send appointment reminder email
export async function sendAppointmentReminder({ to, appointment, patient }: EmailOptions) {
  const date = format(appointment.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const time = format(appointment.date, "h:mm a", { locale: es });

  const confirmationUrl = `${process.env.NEXTAUTH_URL}/appointments/confirm/${appointment.id}`;
  const rescheduleUrl = `${process.env.NEXTAUTH_URL}/appointments/reschedule/${appointment.id}`;

  const services = appointment.services.join(', ');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Recordatorio de Cita</h2>
      <p>Hola ${patient.name},</p>
      <p>Te recordamos que tienes una cita programada para hoy con los siguientes detalles:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${date}</p>
        <p><strong>Hora:</strong> ${time}</p>
        <p><strong>Fisioterapeuta:</strong> ${appointment.therapist}</p>
        <p><strong>Servicios:</strong> ${services}</p>
        <p><strong>Ubicación:</strong> Clínica de Fisioterapia, Av. Principal #123</p>
      </div>
      
      <p>Por favor confirma tu asistencia haciendo clic en el siguiente botón:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Confirmar Cita</a>
      </div>
      
      <p>Si necesitas reprogramar tu cita, puedes hacerlo aquí:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${rescheduleUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reprogramar Cita</a>
      </div>
      
      <p style="color: #777; font-size: 0.9em;">Si tienes alguna pregunta o necesitas ayuda, por favor contáctanos al (123) 456-7890 o responde a este correo.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 0.8em;">
        <p>© ${new Date().getFullYear()} Clínica de Fisioterapia. Todos los derechos reservados.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Recordatorio de Cita - Clínica de Fisioterapia',
      html,
    });

    console.log(`Reminder email sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error };
  }
}
