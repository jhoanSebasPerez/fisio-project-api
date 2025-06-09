import nodemailer from 'nodemailer';

// Configuración para servicios de correo, optimizada para Gmail
export const createTransporter = async () => {
  try {
    console.log('Iniciando creación de transporter de correo...');
    
    // Obtener credenciales de Gmail desde las variables de entorno
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    
    // Si tenemos credenciales de Gmail, usar Gmail como servicio principal
    if (gmailUser && gmailPassword) {
      console.log('Usando Gmail como servicio de correo');
      return nodemailer.createTransport({
        service: 'gmail',  // No es necesario especificar host y puerto para Gmail
        auth: {
          user: gmailUser,
          // Usando 'app password' generado en la configuración de seguridad de Google
          pass: gmailPassword,
        },
        // Configuración adicional para mayor confiabilidad
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production', 
        },
      });
    }
    
    // Si no hay credenciales de Gmail pero sí hay configuración SMTP genérica, usamos esa
    if (process.env.EMAIL_SERVER && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('Usando configuración SMTP genérica');
      return nodemailer.createTransport({
        host: process.env.EMAIL_SERVER,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });
    }
    
    // Si no hay credenciales reales configuradas y estamos en desarrollo
    console.log('No se encontraron credenciales reales. Intentando modo de desarrollo...');
    
    // En modo desarrollo, primero intentamos con una cuenta de prueba Ethereal
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('Creando cuenta de prueba en Ethereal...');
        const testAccount = await nodemailer.createTestAccount();
        if (testAccount) {
          console.log('Cuenta de prueba creada correctamente:', testAccount.user);
          return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
        }
      } catch (etherealError) {
        console.error('Error al crear cuenta de prueba en Ethereal:', etherealError);
      }
    }
    
    // Como último recurso, usamos un transporte que solo imprime en consola
    console.log('Usando modo de depuración (volcado a consola)');
    return {
      sendMail: async (options: any) => {
        console.log('=======================================================');
        console.log('CORREO (MODO DEPURACIÓN - NO SE ENVÍA REALMENTE):');
        console.log('De:', options.from);
        console.log('Para:', options.to);
        console.log('Asunto:', options.subject);
        console.log('HTML:', options.html ? '[Contenido HTML disponible]' : 'No disponible');
        console.log('=======================================================');
        return { 
          messageId: 'debug-' + Date.now(), 
          response: 'Correo solo registrado en consola (no enviado)',
          preview: 'No disponible en modo consola'
        };
      }
    } as any;
    
  } catch (error) {
    console.error('Error al crear el transporter de correo:', error);
    throw error;
  }
};

// Función para construir URLs completas
export const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

// Configuración del remitente
export const getEmailSender = () => {
  return process.env.EMAIL_FROM || 'Centro de Fisioterapia <noreply@fisioterapia.com>';
};
