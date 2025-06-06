'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  
  // Prevenir problemas de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redireccionar si ya hay sesión activa
  useEffect(() => {
    if (mounted && status === 'authenticated') {
      // Redireccionar según el rol
      if (session.user.role === 'ADMIN' || session.user.role === 'THERAPIST') {
        router.push('/dashboard');
      } else if (session.user.role === 'PATIENT') {
        router.push('/profile');
      } else {
        router.push('/');
      }
    }
  }, [status, router, mounted, session]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      const response = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (response?.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Credenciales inválidas',
        });
        return;
      }

      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Has iniciado sesión correctamente',
      });
      
      // Redireccionar según el rol del usuario que acaba de iniciar sesión
      // Como no tenemos acceso directo al rol en este punto, dejamos que la redirección
      // se maneje en el useEffect que observa el cambio de estado de sesión
      // o usamos el callbackUrl si se especificó
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al iniciar sesión',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar pantalla de carga mientras verifica la sesión
  if (status === 'loading' || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ¿No tienes una cuenta?{' '}
            <Link href="/auth/register" className="font-medium text-primary hover:text-primary/80">
              Regístrate
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1">
                <Input
                  id="email"
                  type="email"
                  disabled={isLoading}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1">
                <Input
                  id="password"
                  type="password"
                  disabled={isLoading}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
