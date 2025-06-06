export interface AppointmentDetails {
  id: string;
  date: Date;
  therapist: string;
  services: string[];
}

export interface PatientDetails {
  name: string;
}

export interface EmailOptions {
  to: string;
  appointment: AppointmentDetails;
  patient: PatientDetails;
}

export function sendAppointmentConfirmation(options: EmailOptions): Promise<{success: boolean, error?: any}>;
export function sendAppointmentReminder(options: EmailOptions): Promise<{success: boolean, error?: any}>;
