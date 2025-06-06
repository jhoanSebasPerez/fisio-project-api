'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Para activar la cuenta de un terapeuta usando el token
export default function ActivateAccountPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [therapistName, setTherapistName] = useState<string | null>(null);

  // Verificar validez del token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`/api/auth/verify-token?token=${token}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setTokenValid(true);
          setTherapistName(data.name || '');
        } else {
          setTokenValid(false);
          setError(data.error || 'El enlace de activación es inválido o ha expirado.');
        }
      } catch (err) {
        console.error('Error al verificar el token:', err);
        setTokenValid(false);
        setError('Error al verificar el enlace de activación.');
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    // Validar que la contraseña tenga al menos 6 caracteres
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Tu contraseña ha sido establecida correctamente.');
        // Limpiamos los campos
        setPassword('');
        setConfirmPassword('');
        // Redirigir al login después de un tiempo
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Ha ocurrido un error al actualizar tu contraseña.');
      }
    } catch (err) {
      console.error('Error al actualizar la contraseña:', err);
      setError('Error de comunicación con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl font-semibold text-gray-700">Verificando enlace de activación...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-red-600">Enlace inválido</h2>
          </div>
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
            <p className="text-red-700">{error || 'El enlace de activación es inválido o ha expirado.'}</p>
          </div>
          <div className="text-center">
            <Link href="/login" className="text-blue-600 hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Activación de cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {therapistName ? `Hola ${therapistName}, por favor establece tu contraseña` : 'Por favor establece tu contraseña para activar tu cuenta'}
          </p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
            {successMessage}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Ingresa tu nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                disabled={isLoading || !!successMessage}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirma tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                disabled={isLoading || !!successMessage}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !!successMessage}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading || successMessage
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isLoading ? 'Procesando...' : successMessage ? 'Completado' : 'Activar cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
