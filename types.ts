
export type Role = 'MASTER_ADMIN' | 'EMPRESA_ADMIN' | 'CLIENTE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  companyId?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface Provider {
  id: string;
  name: string;
  email?: string;
  active: boolean;
  avatar?: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'on_way' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  providerId?: string; 
  serviceId?: string;  
  title: string;       
  start: string;       
  end: string;         
  status: AppointmentStatus;
  notes?: string;
  type: 'service' | 'block';
  // Novos campos
  customFields?: Record<string, any>;
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: PaymentMethod;
  price?: number;
}

export interface TimeRange {
  start: string;
  end: string;  
  active: boolean;
}

export interface DaySchedule {
  active: boolean;
  intervalMinutes: number;
  morning: TimeRange;
  afternoon: TimeRange;
  night: TimeRange;
}

export interface WeekAvailability {
  [key: string]: DaySchedule;
}

export interface DayException {
  date: string;
  schedule: DaySchedule;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type ViewMode = 'list' | 'calendar';

// --- NOVOS TIPOS ---

// 4. Eventos
export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string; // ISO DateTime
  durationMinutes: number;
  capacity: number;
  meetingUrl?: string; // Zoom/Meet
  speaker?: string;
  attendees: string[]; // Client IDs
  attachments?: string[]; // Mock URLs
}

// 5. Formulários Personalizados
export type CustomFieldType = 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'checkbox' | 'select';

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // Para 'select'
}

// 6. & 7. Financeiro e Pagamentos
export type PaymentMethod = 'pix' | 'credit_card' | 'money' | 'debit_card' | 'boleto' | 'transfer';
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  paymentMethod?: PaymentMethod;
  category?: string;
  relatedAppointmentId?: string;
  relatedEventId?: string;
  providerId?: string; // Para calcular comissão/total por prestador
}
