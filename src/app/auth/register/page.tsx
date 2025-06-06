'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos').optional(),
});

type RegisterFormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);
      
      // Register the user
      await axios.post('/api/register', data);
      
      toast({
        title: 'Registro exitoso',
        description: 'Tu cuenta ha sido creada correctamente',
      });
      
      router.push('/auth/login');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al registrar tu cuenta',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Crear una cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
              Inicia sesión
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <div className="mt-1">
                <Input
                  id="name"
                  type="text"
                  disabled={isLoading}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
            </div>

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

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <div className="mt-1">
                <Input
                  id="phone"
                  type="text"
                  disabled={isLoading}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
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
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
