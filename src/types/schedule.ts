export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export const dayOfWeekLabels: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Lunes',
  [DayOfWeek.TUESDAY]: 'Martes',
  [DayOfWeek.WEDNESDAY]: 'Miércoles',
  [DayOfWeek.THURSDAY]: 'Jueves',
  [DayOfWeek.FRIDAY]: 'Viernes',
  [DayOfWeek.SATURDAY]: 'Sábado',
  [DayOfWeek.SUNDAY]: 'Domingo',
};

export interface TherapistBasic {
  id: string;
  name: string;
  email: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface Schedule {
  id: string;
  therapistId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  therapist?: TherapistBasic;
  services?: Service[];
  serviceId?: string; // Campo opcional para el ID del servicio seleccionado
}

export interface CreateScheduleFormData {
  therapistId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  serviceId: string; // Ahora usamos un solo serviceId
  isActive: boolean;
  // endTime se calcula automáticamente basado en la duración del servicio
}

export interface UpdateScheduleFormData {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  serviceIds?: string[];
}

export interface ScheduleFilters {
  therapistId?: string;
  dayOfWeek?: DayOfWeek;
  serviceId?: string;
}
