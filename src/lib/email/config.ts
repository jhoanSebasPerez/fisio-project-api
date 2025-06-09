import nodemailer from 'nodemailer';

// Configuración que evita el error 'Missing credentials for PLAIN'
export const createTransporter = async () => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.verify();
    console.log('SMTP conectado correctamente');

    return transporter;
  } catch (error) {
    console.error('Error al crear el transporter de correo con Gmail:', error);
    throw error;
  }
};

// Función para construir URLs completas
export const getBaseUrl = () => {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
};

// Configuración del remitente
export const getEmailSender = () => {
  return process.env.GMAIL_USER || 'Centro de Fisioterapia <noreply@fisioterapia.com>';
};
