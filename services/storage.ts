
import { Appointment, Client, User, WeekAvailability, Role, Service, Provider, DayException, Event, CustomField, Transaction } from '../types';
import { isSameDay, parseISO } from 'date-fns';

// Keys for localStorage
const APPOINTMENTS_KEY = 'cronos_appointments';
const CLIENTS_KEY = 'cronos_clients';
const USER_KEY = 'cronos_user';
const AVAILABILITY_KEY = 'cronos_availability';
const EXCEPTIONS_KEY = 'cronos_exceptions';
const SERVICES_KEY = 'cronos_services';
const PROVIDERS_KEY = 'cronos_providers';
const EVENTS_KEY = 'cronos_events';
const FORM_CONFIG_KEY = 'cronos_form_config';
const TRANSACTIONS_KEY = 'cronos_transactions';

// Helper to delay simulation (make it feel like a real API)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Clients ---

export const getClients = async (): Promise<Client[]> => {
  await delay(300);
  const data = localStorage.getItem(CLIENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveClient = async (client: Client): Promise<Client> => {
  await delay(300);
  const clients = await getClients();
  const existingIndex = clients.findIndex((c) => c.id === client.id);
  
  if (existingIndex >= 0) {
    clients[existingIndex] = client;
  } else {
    clients.push(client);
  }
  
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  return client;
};

export const deleteClient = async (id: string): Promise<void> => {
  await delay(300);
  const clients = await getClients();
  const filtered = clients.filter((c) => c.id !== id);
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(filtered));
};

// --- Services ---

export const getServices = async (): Promise<Service[]> => {
  await delay(200);
  const data = localStorage.getItem(SERVICES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveService = async (service: Service): Promise<Service> => {
  await delay(200);
  const items = await getServices();
  const idx = items.findIndex(i => i.id === service.id);
  if (idx >= 0) items[idx] = service;
  else items.push(service);
  localStorage.setItem(SERVICES_KEY, JSON.stringify(items));
  return service;
};

export const deleteService = async (id: string): Promise<void> => {
  const items = await getServices();
  localStorage.setItem(SERVICES_KEY, JSON.stringify(items.filter(i => i.id !== id)));
};

// --- Providers ---

export const getProviders = async (): Promise<Provider[]> => {
  await delay(200);
  const data = localStorage.getItem(PROVIDERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProvider = async (provider: Provider): Promise<Provider> => {
  await delay(200);
  const items = await getProviders();
  const idx = items.findIndex(i => i.id === provider.id);
  if (idx >= 0) items[idx] = provider;
  else items.push(provider);
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(items));
  return provider;
};

export const deleteProvider = async (id: string): Promise<void> => {
  const items = await getProviders();
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(items.filter(i => i.id !== id)));
};


// --- Appointments ---

export const getAppointments = async (): Promise<Appointment[]> => {
  await delay(300);
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const checkConflict = async (start: string, end: string, providerId?: string, excludeId?: string): Promise<boolean> => {
  const appointments = await getAppointments();
  const newStart = new Date(start).getTime();
  const newEnd = new Date(end).getTime();

  return appointments.some((apt) => {
    if (apt.status === 'cancelled') return false;
    if (excludeId && apt.id === excludeId) return false;
    
    if (providerId && apt.providerId && providerId !== apt.providerId) {
        return false;
    }

    const aptStart = new Date(apt.start).getTime();
    const aptEnd = new Date(apt.end).getTime();

    return (newStart < aptEnd && newEnd > aptStart);
  });
};

export const saveAppointment = async (appointment: Appointment): Promise<Appointment> => {
  await delay(400);
  
  const hasConflict = await checkConflict(appointment.start, appointment.end, appointment.providerId, appointment.id);
  if (hasConflict) {
    throw new Error("Conflito detectado: Este horário já está reservado para este prestador.");
  }

  const appointments = await getAppointments();
  const existingIndex = appointments.findIndex((a) => a.id === appointment.id);

  if (existingIndex >= 0) {
    appointments[existingIndex] = appointment;
  } else {
    appointments.push(appointment);
  }

  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
  
  // Auto-generate transaction if paid
  if (appointment.paymentStatus === 'paid' && appointment.price && appointment.price > 0) {
      const existingTransaction = (await getTransactions()).find(t => t.relatedAppointmentId === appointment.id);
      if (!existingTransaction) {
          const transaction: Transaction = {
              id: crypto.randomUUID(),
              description: `Agendamento: ${appointment.title}`,
              amount: appointment.price,
              type: 'income',
              status: 'paid',
              date: new Date().toISOString(),
              paymentMethod: appointment.paymentMethod || 'money',
              relatedAppointmentId: appointment.id,
              providerId: appointment.providerId
          };
          await saveTransaction(transaction);
      }
  }

  return appointment;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await delay(300);
  const appointments = await getAppointments();
  const filtered = appointments.filter((a) => a.id !== id);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(filtered));
};

// --- Availability & Exceptions ---

export const getAvailability = async (): Promise<WeekAvailability> => {
  await delay(200);
  const data = localStorage.getItem(AVAILABILITY_KEY);
  if (data) return JSON.parse(data);

  const defaultDay = {
    active: true,
    intervalMinutes: 60,
    morning: { start: '09:00', end: '12:00', active: true },
    afternoon: { start: '13:00', end: '18:00', active: true },
    night: { start: '19:00', end: '21:00', active: false },
  };

  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay, afternoon: { ...defaultDay.afternoon, active: false } },
    sunday: { ...defaultDay, active: false },
  };
};

export const saveAvailability = async (availability: WeekAvailability): Promise<void> => {
  await delay(500);
  localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(availability));
};

export const getExceptions = async (): Promise<DayException[]> => {
  const data = localStorage.getItem(EXCEPTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveException = async (exception: DayException): Promise<void> => {
  const exceptions = await getExceptions();
  const idx = exceptions.findIndex(e => e.date === exception.date);
  if (idx >= 0) exceptions[idx] = exception;
  else exceptions.push(exception);
  localStorage.setItem(EXCEPTIONS_KEY, JSON.stringify(exceptions));
};

export const deleteException = async (date: string): Promise<void> => {
  const exceptions = await getExceptions();
  localStorage.setItem(EXCEPTIONS_KEY, JSON.stringify(exceptions.filter(e => e.date !== date)));
};

// --- EVENTS ---

export const getEvents = async (): Promise<Event[]> => {
  await delay(300);
  const data = localStorage.getItem(EVENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveEvent = async (event: Event): Promise<Event> => {
  const events = await getEvents();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  return event;
};

export const deleteEvent = async (id: string): Promise<void> => {
  const events = await getEvents();
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.filter(e => e.id !== id)));
};

// --- CUSTOM FORMS ---

export const getFormConfig = async (): Promise<CustomField[]> => {
  const data = localStorage.getItem(FORM_CONFIG_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveFormConfig = async (fields: CustomField[]): Promise<void> => {
  localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(fields));
};

// --- FINANCIAL / TRANSACTIONS ---

export const getTransactions = async (): Promise<Transaction[]> => {
  await delay(300);
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTransaction = async (tx: Transaction): Promise<Transaction> => {
  const txs = await getTransactions();
  const idx = txs.findIndex(t => t.id === tx.id);
  if (idx >= 0) txs[idx] = tx;
  else txs.push(tx);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
  return tx;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const txs = await getTransactions();
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs.filter(t => t.id !== id)));
};


// --- Auth ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  await delay(800);
  
  let role: Role = 'CLIENTE';
  let name = 'Usuário';

  if (email.includes('master')) {
    role = 'MASTER_ADMIN';
    name = 'Master Admin';
  } else if (email.includes('admin')) {
    role = 'EMPRESA_ADMIN';
    name = 'Admin da Empresa';
  } else {
    role = 'CLIENTE';
    name = 'Cliente Demo';
  }

  if (password.length < 3) throw new Error("Senha inválida");
  
  const user: User = {
    id: email,
    name: name,
    email: email,
    role: role,
    avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = async (): Promise<void> => {
  localStorage.removeItem(USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// --- Init Data ---
export const seedData = () => {
  if (!localStorage.getItem(CLIENTS_KEY)) {
    const clients: Client[] = [
      { id: '1', name: 'Maria Silva', email: 'maria@example.com', phone: '11999999999', createdAt: new Date().toISOString() },
      { id: '2', name: 'João Santos', email: 'joao@example.com', phone: '11988888888', createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }
  
  if (!localStorage.getItem(SERVICES_KEY)) {
    const services: Service[] = [
        { id: '1', name: 'Corte de Cabelo', durationMinutes: 45, price: 50, active: true },
        { id: '2', name: 'Barba', durationMinutes: 30, price: 30, active: true },
    ];
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  }

  if (!localStorage.getItem(PROVIDERS_KEY)) {
    const providers: Provider[] = [
        { id: '1', name: 'Carlos Barbeiro', active: true },
        { id: '2', name: 'Ana Cabeleireira', active: true },
    ];
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(providers));
  }

  if (!localStorage.getItem(EVENTS_KEY)) {
     const events: Event[] = [
        { 
          id: '1', 
          name: 'Workshop de Tendências 2024', 
          date: new Date(Date.now() + 86400000 * 5).toISOString(), 
          durationMinutes: 120, 
          capacity: 50, 
          speaker: 'Ana Cabeleireira',
          attendees: ['1', '2']
        }
     ];
     localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }

  if (!localStorage.getItem(TRANSACTIONS_KEY)) {
      const txs: Transaction[] = [
          { id: '1', description: 'Corte de Cabelo (João)', amount: 50, type: 'income', status: 'paid', date: new Date(Date.now() - 86400000).toISOString(), paymentMethod: 'pix' },
          { id: '2', description: 'Conta de Luz', amount: 150, type: 'expense', status: 'paid', date: new Date(Date.now() - 86400000 * 2).toISOString(), paymentMethod: 'boleto' }
      ];
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txs));
  }
};
