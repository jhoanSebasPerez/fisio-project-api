/**
 * Utility functions for password management
 */

/**
 * Generates a random password of specified length
 * @param length Length of the password to generate (default: 10)
 * @returns A random string password
 */
export function generateRandomPassword(length: number = 10): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=';
  let password = '';
  
  for (let i = 0, n = charset.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  
  return password;
}
