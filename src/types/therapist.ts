export interface Service {
  id: string;
  name: string;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active?: boolean;
  therapistServices?: { service: Service }[];
}
