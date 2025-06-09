'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { format, addDays, startOfDay, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

interface Therapist {
  id: string;
  name: string;
}

const appointmentFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  date: z.date({ required_error: 'La fecha es requerida' }),
  time: z.string().min(1, 'La hora es requerida'),
  therapistId: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un servicio'),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export default function NewAppointmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Podemos seguir usando session para personalizar la experiencia si el usuario está autenticado
  // pero no es necesario para agendar
  const { data: session } = useSession();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const preselectedServiceId = searchParams.get('serviceId');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      serviceIds: preselectedServiceId ? [preselectedServiceId] : [],
      date: addDays(new Date(), 1),
      therapistId: '',
    },
  });

  const serviceIds = watch('serviceIds');
  const selectedDate = watch('date');
  const selectedTherapistId = watch('therapistId');

  useEffect(() => {
    if (selectedDate) {
      const dayStart = setHours(setMinutes(startOfDay(selectedDate), 0), 8);
      const times: string[] = [];
      for (let i = 0; i < 20; i++) {
        const time = new Date(dayStart.getTime() + i * 30 * 60000);
        times.push(format(time, 'HH:mm'));
      }
      setAvailableTimes(times);
      setValue('time', '');
    }
  }, [selectedDate, setValue]);

  // Cargar la lista de terapeutas al inicio
  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const therapistsResponse = await axios.get('/api/therapists');
        setTherapists(therapistsResponse.data);
      } catch (error) {
        console.error('Error fetching therapists:', error);
        toast({ title: 'Error', description: 'No se pudieron cargar los fisioterapeutas.', variant: 'destructive' });
      }
    };
    fetchTherapists();
  }, [toast]);

  // Cargar servicios cuando se seleccione un terapeuta
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        
        // Si hay un terapeuta seleccionado y no es "Sin preferencia"
        if (selectedTherapistId && selectedTherapistId !== ' ') {
          // Obtener los servicios que ofrece este terapeuta
          const response = await axios.get(`/api/therapist-services?therapistId=${selectedTherapistId}`);
          setFilteredServices(response.data);
        } else {
          // Si no hay terapeuta seleccionado o es "Sin preferencia", mostrar todos los servicios
          const response = await axios.get('/api/services?activeOnly=true');
          setServices(response.data);
          setFilteredServices(response.data);
        }
        
        // Resetear la selección de servicios cuando cambia el terapeuta
        setValue('serviceIds', []);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast({ 
          title: 'Error', 
          description: 'No se pudieron cargar los servicios disponibles.', 
          variant: 'destructive' 
        });
      } finally {
        setLoadingServices(false);
      }
    };
    
    // Solo cargar servicios si ya se han cargado los terapeutas
    if (therapists.length > 0) {
      fetchServices();
    }
  }, [selectedTherapistId, setValue, toast, therapists.length]);

  // Manejar servicio preseleccionado si existe
  useEffect(() => {
    if (preselectedServiceId && services.length > 0) {
      setValue('serviceIds', [preselectedServiceId]);
    }
  }, [preselectedServiceId, setValue, services]);

  const onSubmit = async (data: AppointmentFormValues) => {
    setIsLoading(true);
    try {
      const appointmentDateTime = new Date(data.date);
      const [hours, minutes] = data.time.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes);

      // Preparar los datos del paciente si no está autenticado
      const appointmentData = {
        date: appointmentDateTime.toISOString(),
        therapistId: data.therapistId || undefined,
        serviceIds: data.serviceIds,
        // Enviar datos del paciente para citas sin autenticación
        patient: {
          name: data.name,
          email: data.email,
          phone: data.phone
        }
      };

      // Usar el endpoint con parámetro public=true para permitir citas sin autenticación
      const response = await axios.post('/api/appointments?public=true', appointmentData);

      toast({
        title: '¡Cita agendada con éxito!',
        description: 'Hemos enviado un correo de confirmación a ' + data.email + ' con todos los detalles de tu cita.'
      });

      // Redirigir a la página de confirmación
      router.push('/appointments/confirmation');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      const errorMessage = error.response?.data?.error || 'No se pudo agendar la cita.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Clínica de Fisioterapia</h1>
            <Link href="/">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Agendar Nueva Cita</h2>
          <p className="text-center text-gray-600 mb-8">
            Agenda tu cita en minutos sin necesidad de crear una cuenta. Recibirás todos los detalles y recordatorios por correo electrónico.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Therapist Selection - Now first */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Selección de Fisioterapeuta</h3>
              <p className="text-gray-600 mb-4">Primero selecciona un fisioterapeuta para ver los servicios que ofrece.</p>

              <Controller
                control={control}
                name="therapistId"
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={isLoading || therapists.length === 0}
                  >
                    <SelectTrigger className="w-full h-12 border-2 shadow-sm hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <SelectValue placeholder="Selecciona un fisioterapeuta" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Sin preferencia (mostrar todos los servicios)</SelectItem>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          {therapist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Services Section - Only shown after therapist is selected */}
            {(selectedTherapistId || selectedTherapistId === ' ') && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Servicios Disponibles</h3>
                <p className="text-gray-600 mb-4">
                  {selectedTherapistId && selectedTherapistId !== ' ' 
                    ? 'Servicios ofrecidos por este fisioterapeuta:' 
                    : 'Todos los servicios disponibles:'}
                </p>
                {errors.serviceIds && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {errors.serviceIds.message}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {loadingServices ? (
                    <div className="p-6 text-center border border-dashed rounded-md">
                      <p className="text-gray-500">Cargando servicios disponibles...</p>
                    </div>
                  ) : filteredServices.length > 0 ? (
                    filteredServices.map((service) => {
                      // Obtenemos los servicios seleccionados del formulario
                      const serviceIds = watch('serviceIds');
                      const isChecked = serviceIds.includes(service.id);
  
                      return (
                        <div
                          key={service.id}
                          onClick={() => {
                            // Creamos una copia de los servicios actuales
                            const currentServices = [...serviceIds];
  
                            // Modificamos la copia
                            if (isChecked) {
                              const index = currentServices.indexOf(service.id);
                              if (index > -1) {
                                currentServices.splice(index, 1);
                              }
                            } else {
                              currentServices.push(service.id);
                            }
  
                            // Actualizamos el formulario con la copia modificada
                            setValue('serviceIds', currentServices);
                          }}
                          className={`
                            p-4 border-2 rounded-lg cursor-pointer transition-all overflow-hidden
                            hover:border-primary hover:shadow-md
                            ${isChecked ? 'border-primary bg-primary/5' : 'border-gray-200'}
                          `}
                        >
                          {/* Imagen del servicio */}
                          {service.imageUrl && (
                            <div className="w-full h-[120px] mb-3 overflow-hidden rounded-md">
                              <img 
                                src={service.imageUrl} 
                                alt={service.name} 
                                className="w-full h-full object-cover transition-transform hover:scale-105"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {/* Indicador visual de selección */}
                              <div
                                className={`h-5 w-5 rounded-sm border-2 border-primary ring-offset-background flex items-center justify-center
                                  ${isChecked ? 'bg-primary' : 'bg-transparent'}`}
                              >
                                {isChecked && (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="white" className="h-4 w-4">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 grid gap-1">
                              <div className="flex justify-between items-start">
                                <span className="text-base font-semibold cursor-pointer">
                                  {service.name}
                                </span>
                                <span className="text-base font-bold text-primary">
                                  ${service.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-2">
                                {service.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center border border-dashed rounded-md">
                      <p className="text-gray-500">
                        {selectedTherapistId && selectedTherapistId !== ' ' 
                          ? 'Este fisioterapeuta no ofrece servicios actualmente.' 
                          : 'No hay servicios disponibles en este momento.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Fecha y Hora - Solo se muestra después de seleccionar servicios */}
            {watch('serviceIds').length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Fecha y Hora</h3>
                <p className="text-gray-600 mb-4">Selecciona cuándo deseas agendar tu cita:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-3">Fecha</p>
                    <Controller
                      control={control}
                      name="date"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal h-12 border-2 shadow-sm hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                  <line x1="16" x2="16" y1="2" y2="6" />
                                  <line x1="8" x2="8" y1="2" y2="6" />
                                  <line x1="3" x2="21" y1="10" y2="10" />
                                </svg>
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span className="text-gray-500">Selecciona una fecha</span>
                                )}
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date: any) => {
                                // Obtener la fecha actual en Colombia (GMT-5)
                                const now = new Date();
                                
                                // Crear la fecha de hoy en Colombia con hora 00:00:00
                                const todayColombia = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                                
                                // Deshabilitar domingos y días pasados, pero permitir el día actual
                                return (date < todayColombia && date.getTime() !== todayColombia.getTime()) || date.getDay() === 0;
                              }}
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-3">Hora</p>
                    <Controller
                      control={control}
                      name="time"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading || !selectedDate}
                        >
                          <SelectTrigger className="w-full h-12 border-2 shadow-sm hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <SelectValue placeholder="Seleccionar hora" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <div className="grid grid-cols-3 gap-1 p-2">
                              {availableTimes.map((time) => (
                                <SelectItem
                                  key={time}
                                  value={time}
                                  className="rounded-md cursor-pointer text-center py-2 px-3 hover:bg-gray-100 transition-colors"
                                >
                                  {time}
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.time && (
                      <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Patient Information - Only shown if not logged in as a patient */}
            {(!session || session.user.role !== 'PATIENT') && watch('serviceIds').length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Información de Contacto</h3>
                <p className="text-gray-600 mb-4">Necesitamos estos datos para enviarte la confirmación y recordatorios de tu cita.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-3">
                      Nombre completo
                    </label>
                    <Input
                      id="name"
                      {...register('name')}
                      className="w-full h-12 border-2 rounded-md shadow-sm hover:border-gray-300 focus:border-primary"
                      placeholder="Ej. Juan Pérez"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-3">
                      Correo electrónico
                    </label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="w-full h-12 border-2 rounded-md shadow-sm hover:border-gray-300 focus:border-primary"
                      placeholder="Ej. juanperez@ejemplo.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-lg font-medium text-gray-700 mb-3">
                      Teléfono
                    </label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      className="w-full h-12 border-2 rounded-md shadow-sm hover:border-gray-300 focus:border-primary"
                      placeholder="Ej. 1234567890"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button - Solo se muestra si se ha seleccionado al menos un servicio */}
            {watch('serviceIds').length > 0 && (
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Agendando...' : 'Agendar Cita'}
              </Button>
            )}
          </form>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Clínica de Fisioterapia</h3>
              <p className="text-gray-300">Ofreciendo servicios de calidad para mejorar tu bienestar físico.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Contacto</h3>
              <p className="text-gray-300">Dirección: Av. Principal #123</p>
              <p className="text-gray-300">Teléfono: (123) 456-7890</p>
              <p className="text-gray-300">Email: info@clinica.com</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Horarios</h3>
              <p className="text-gray-300">Lunes a Viernes: 8:00 AM - 8:00 PM</p>
              <p className="text-gray-300">Sábados: 8:00 AM - 2:00 PM</p>
              <p className="text-gray-300">Domingos: Cerrado</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-6 text-center">
            <p className="text-gray-300">&copy; {new Date().getFullYear()} Clínica de Fisioterapia. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
