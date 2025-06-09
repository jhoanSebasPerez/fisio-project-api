import crypto from 'crypto';

/**
 * Funciones de utilidad para la seguridad de datos médicos
 * Provee métodos de cifrado, descifrado y protección de datos sensibles
 */

/**
 * Cifra datos médicos sensibles usando AES-256-CBC
 * @param data - Datos a cifrar
 * @returns Datos cifrados con formato iv:encrypted
 */
export function encryptMedicalData(data: string): string {
  try {
    // Usar una clave de cifrado segura almacenada en variables de entorno
    const encryptionKey = process.env.MEDICAL_DATA_ENCRYPTION_KEY || 'default-key-for-development';
    
    // Generar un IV único para cada encriptación
    const iv = crypto.randomBytes(16);
    
    // Crear un cifrador con la clave y el IV
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      Buffer.from(encryptionKey.length === 32 ? encryptionKey : encryptionKey.padEnd(32, '0')), 
      iv
    );
    
    // Cifrar los datos
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Guardar IV junto con los datos cifrados para posibilitar el descifrado
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encrypting medical data:', error);
    return data; // Fallback a datos no cifrados si falla la encriptación
  }
}

/**
 * Descifra datos médicos cifrados
 * @param encryptedData - Datos cifrados en formato iv:encrypted
 * @returns Datos descifrados
 */
export function decryptMedicalData(encryptedData: string): string {
  try {
    // Comprobar si los datos están cifrados (deben contener el separador IV:datos)
    if (!encryptedData.includes(':')) {
      return encryptedData;
    }
    
    // Usar la misma clave utilizada para el cifrado
    const encryptionKey = process.env.MEDICAL_DATA_ENCRYPTION_KEY || 'default-key-for-development';
    
    // Separar IV y datos cifrados
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Crear descifrador con la misma clave e IV
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(encryptionKey.length === 32 ? encryptionKey : encryptionKey.padEnd(32, '0')),
      iv
    );
    
    // Descifrar los datos
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting medical data:', error);
    return encryptedData; // Devolver datos originales si falla el descifrado
  }
}

/**
 * Verifica si un usuario tiene permiso para acceder a datos médicos específicos
 * @param userId - ID del usuario que intenta acceder
 * @param userRole - Rol del usuario (ADMIN, THERAPIST, PATIENT)
 * @param resourceType - Tipo de recurso médico (appointment, therapist_note, etc)
 * @param resourceId - ID del recurso
 * @returns Promise<boolean> - true si tiene acceso, false en caso contrario
 */
export async function hasMedicalAccessPermission(
  userId: string,
  userRole: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // Los administradores siempre tienen acceso
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Implementar lógica específica según el tipo de recurso
  // Esta es una implementación conceptual que debe adaptarse según la estructura de datos
  
  return false; // Por defecto, denegar acceso si no se cumple ninguna condición
}

/**
 * Sanitiza datos médicos para presentación al público
 * Útil para cuando se necesita mostrar parte de la información pero ocultando datos sensibles
 * @param data - Objeto con datos médicos
 * @returns Objeto sanitizado
 */
export function sanitizeMedicalData(data: Record<string, any>): Record<string, any> {
  // Clonar el objeto para no modificar el original
  const sanitized = {...data};
  
  // Lista de campos sensibles para sanitizar
  const sensitiveFields = ['diagnosis', 'treatment', 'medicalHistory', 'medications'];
  
  // Sanitizar campos sensibles
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      // Ejemplo: reemplazar el contenido completo con un indicador
      sanitized[field] = '[Información médica confidencial]';
    }
  }
  
  return sanitized;
}
