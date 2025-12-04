import React, { useEffect, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Wand2, 
  Trash2, 
  Edit2, 
  MessageSquare,
  AlertCircle,
  Users,
  X,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Truck,
  Timer,
  CreditCard
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO, 
  addMinutes, 
  startOfHour
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment, Client, Service, Provider, AppointmentStatus, CustomField, PaymentMethod } from '../types';
import { getAppointments, saveAppointment, deleteAppointment, getClients, getServices, getProviders, getFormConfig } from '../services/storage';
import { analyzeSchedulingRequest, generateReminderMessage } from '../services/geminiService';
import { Button, Input, Modal, Card } from '../components/Shared';

const statusConfig: Record<AppointmentStatus, { label: string, color: string, icon: any }> = {
  pending: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle2 },
  on_way: { label: 'A caminho', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Truck },
  in_progress: { label: 'Em Andamento', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Timer },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: UserCheck },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const Schedule = () => {
  // State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [customFormFields, setCustomFormFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Side Panel
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);
  const [selectedDayDetails, setSelectedDayDetails] = useState<Date | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    providerId: '',
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00', 
    status: 'confirmed' as AppointmentStatus,
    notes: '',
    // Novos
    customFields: {} as Record<string, any>,
    price: 0,
    paymentStatus: 'pending' as 'pending' | 'paid',
    paymentMethod: '' as PaymentMethod | ''
  });

  // AI
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial Load
  const loadData = async () => {
    setLoading(true);
    const [appts, clts, svcs, prvs, fields] = await Promise.all([
      getAppointments(), 
      getClients(),
      getServices(),
      getProviders(),
      getFormConfig()
    ]);
    setAppointments(appts);
    setClients(clts);
    setServices(svcs.filter(s => s.active));
    setProviders(prvs.filter(p => p.active));
    setCustomFormFields(fields);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update End Time & Price automatically when Service or Start Time changes
  useEffect(() => {
    if (formData.serviceId) {
       const service = services.find(s => s.id === formData.serviceId);
       if (service) {
         if (formData.startTime) {
             const start = new Date(`${formData.date}T${formData.startTime}`);
             const end = addMinutes(start, service.durationMinutes);
             setFormData(prev => ({ ...prev, endTime: format(end, 'HH:mm'), price: service.price }));
         } else {
             setFormData(prev => ({ ...prev, price: service.price }));
         }
       }
    }
  }, [formData.serviceId, formData.startTime, formData.date, services]);

  // Handlers
  const handleOpenModal = (appt?: Appointment, dateOverride?: Date) => {
    setErrorMsg('');
    if (appt) {
      const start = parseISO(appt.start);
      const end = parseISO(appt.end);
      setEditingAppt(appt);
      setFormData({
        clientId: appt.clientId,
        serviceId: appt.serviceId || '',
        providerId: appt.providerId || '',
        title: appt.title,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        status: appt.status,
        notes: appt.notes || '',
        customFields: appt.customFields || {},
        price: appt.price || 0,
        paymentStatus: appt.paymentStatus || 'pending',
        paymentMethod: appt.paymentMethod || ''
      });
    } else {
      setEditingAppt(null);
      const baseDate = dateOverride || new Date();
      let nextHour = startOfHour(addMinutes(new Date(), 60));
      
      if (dateOverride && !isSameDay(dateOverride, new Date())) {
        nextHour = new Date(dateOverride);
        nextHour.setHours(9, 0, 0, 0);
      }

      setFormData({
        clientId: '',
        serviceId: '',
        providerId: providers.length > 0 ? providers[0].id : '',
        title: '',
        date: format(baseDate, 'yyyy-MM-dd'),
        startTime: format(nextHour, 'HH:mm'),
        endTime: format(addMinutes(nextHour, 60), 'HH:mm'),
        status: 'confirmed',
        notes: '',
        customFields: {},
        price: 0,
        paymentStatus: 'pending',
        paymentMethod: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        setErrorMsg('O horário de término deve ser após o início.');
        return;
      }

      let finalTitle = formData.title;
      if (!finalTitle && formData.serviceId) {
        const svc = services.find(s => s.id === formData.serviceId);
        if (svc) finalTitle = svc.name;
      }
      if (!finalTitle) finalTitle = 'Atendimento';

      const newAppt: Appointment = {
        id: editingAppt ? editingAppt.id : crypto.randomUUID(),
        clientId: formData.clientId || 'unknown',
        serviceId: formData.serviceId || undefined,
        providerId: formData.providerId || undefined,
        title: finalTitle,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        status: formData.status,
        notes: formData.notes,
        type: 'service',
        customFields: formData.customFields,
        price: formData.price,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod || undefined
      };

      await saveAppointment(newAppt);
      await loadData();
      setIsModalOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      await deleteAppointment(id);
      loadData();
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDayDetails(day);
    setIsDayPanelOpen(true);
  };

  const handleAiRequest = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const result = await analyzeSchedulingRequest(aiPrompt, format(new Date(), 'yyyy-MM-dd HH:mm'));
      if (result) {
        const start = parseISO(result.start);
        const end = parseISO(result.end);

        setEditingAppt(null);
        setFormData({
          clientId: '',
          serviceId: '',
          providerId: providers.length > 0 ? providers[0].id : '',
          title: result.title,
          date: format(start, 'yyyy-MM-dd'),
          startTime: format(start, 'HH:mm'),
          endTime: format(end, 'HH:mm'),
          status: 'confirmed',
          notes: result.notes || '',
          customFields: {},
          price: 0,
          paymentStatus: 'pending',
          paymentMethod: ''
        });
        setIsModalOpen(true);
        setAiPrompt('');
      } else {
        alert('Não foi possível entender o pedido. Tente ser mais específico, ex: "Agendar corte amanhã às 14h".');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao processar com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendReminder = async (appt: Appointment) => {
    const client = clients.find(c => c.id === appt.clientId);
    const name = client ? client.name : 'Cliente';
    const time = format(parseISO(appt.start), "HH:mm");
    const msg = await generateReminderMessage(name, time, appt.title);
    
    if(client?.phone) {
       window.open(`https://wa.me/55${client.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
       navigator.clipboard.writeText(msg);
       alert('Mensagem copiada: ' + msg);
    }
  };

  // --- Views Renders ---
  
  const renderCalendarView = () => {
    const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayAppts = appointments
            .filter(a => isSameDay(parseISO(a.start), day) && a.status !== 'cancelled')
            .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());
          
          const isTodayDate = isSameDay(day, new Date());

          return (
            <div 
              key={day.toISOString()} 
              onClick={() => handleDayClick(day)}
              className={`min-h-[200px] bg-white rounded-lg border transition-all cursor-pointer hover:shadow-md ${isTodayDate ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}`}
            >
              <div className={`text-center p-2 mb-2 border-b border-slate-50 flex justify-between items-center ${isTodayDate ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500'}`}>
                <span className="text-sm">{format(day, 'EEE', { locale: ptBR })}</span>
                <span className={`h-6 w-6 flex items-center justify-center rounded-full text-sm ${isTodayDate ? 'bg-indigo-200' : ''}`}>{format(day, 'dd')}</span>
              </div>
              <div className="space-y-1 p-1">
                {dayAppts.slice(0, 5).map(appt => {
                  const status = statusConfig[appt.status];
                  return (
                    <div 
                      key={appt.id}
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(appt); }}
                      className={`p-1.5 text-xs rounded border cursor-pointer transition truncate flex items-center gap-1 ${status.color}`}
                    >
                      <div className="font-semibold w-8 flex-shrink-0">{format(parseISO(appt.start), 'HH:mm')}</div>
                      <div className="truncate">{appt.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
      const sortedAppts = [...appointments]
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => parseISO(b.start).getTime() - parseISO(a.start).getTime());

    return (
      <Card>
        <ul className="divide-y divide-slate-100">
          {sortedAppts.map((appt) => {
            const client = clients.find(c => c.id === appt.clientId);
            const status = statusConfig[appt.status];
            const StatusIcon = status.icon;

            return (
              <li key={appt.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                   <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-slate-100 text-slate-500">
                    <span className="text-sm font-bold">{format(parseISO(appt.start), 'dd')}</span>
                    <span className="text-xs uppercase">{format(parseISO(appt.start), 'MMM', { locale: ptBR })}</span>
                   </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <h4 className="font-medium text-slate-900">{appt.title}</h4>
                       <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                       </span>
                    </div>
                    <div className="text-sm text-slate-500 flex flex-col sm:flex-row sm:items-center mt-1 gap-2 sm:gap-4">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> 
                        {format(parseISO(appt.start), 'HH:mm')} - {format(parseISO(appt.end), 'HH:mm')}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1"/> {client?.name || 'Cliente desconhecido'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleSendReminder(appt)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Enviar Lembrete">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleOpenModal(appt)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  };

  const renderDayPanel = () => {
    if (!selectedDayDetails) return null;
    const dayAppts = appointments
      .filter(a => isSameDay(parseISO(a.start), selectedDayDetails) && a.status !== 'cancelled')
      .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

    return (
       <>
        {isDayPanelOpen && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsDayPanelOpen(false)} />
        )}
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isDayPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{format(selectedDayDetails, "d 'de' MMMM", { locale: ptBR })}</h2>
            </div>
            <button onClick={() => setIsDayPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
             {dayAppts.length === 0 && <p className="text-slate-500 text-center py-4">Nenhum agendamento para este dia.</p>}
             {dayAppts.map(appt => {
                 const status = statusConfig[appt.status];
                 return (
                  <div key={appt.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${status.color.split(' ')[2].replace('border', 'border-l')} border-slate-100`}>
                    <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-slate-900">{appt.title}</h4>
                        <span className={`text-[10px] px-2 py-1 rounded border ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                       <p>{format(parseISO(appt.start), 'HH:mm')} - {format(parseISO(appt.end), 'HH:mm')}</p>
                    </div>
                    <div className="mt-3 flex justify-end">
                       <Button variant="ghost" className="text-xs h-8 px-2" onClick={() => handleOpenModal(appt)}>Editar</Button>
                    </div>
                  </div>
                 )
             })}
          </div>
          <div className="p-4 border-t border-slate-100 bg-white">
            <Button className="w-full py-3" onClick={() => handleOpenModal(undefined, selectedDayDetails)}>
              <Plus className="w-4 h-4 mr-2" /> Agendar neste dia
            </Button>
          </div>
        </div>
       </>
    )
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Agenda Inteligente</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}><CalendarIcon className="w-4 h-4" /></button>
          </div>
          <Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2" /> Novo</Button>
        </div>
      </div>

      <Card className="p-2 flex items-center gap-2">
        <div className="p-2 bg-indigo-50 rounded-lg"><Wand2 className="w-5 h-5 text-indigo-600" /></div>
        <input type="text" placeholder="IA: 'Agendar corte para Maria amanhã as 15h'..." className="flex-1 border-none focus:ring-0 text-sm bg-transparent" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiRequest()} />
        <Button variant="ghost" disabled={!aiPrompt || aiLoading} onClick={handleAiRequest} isLoading={aiLoading}>Gerar</Button>
      </Card>

      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
      {renderDayPanel()}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAppt ? "Editar Agendamento" : "Novo Agendamento"}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Main Info */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Serviço</label>
            <select className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white text-slate-900" value={formData.serviceId} onChange={(e) => setFormData({...formData, serviceId: e.target.value})}>
              <option value="">Selecione um serviço (opcional)</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min) - R$ {s.price}</option>)}
            </select>
          </div>

          {!formData.serviceId && (
            <Input label="Título Personalizado" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Reunião Rápida" />
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white text-slate-900" value={formData.clientId} onChange={(e) => setFormData({...formData, clientId: e.target.value})}>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profissional</label>
              <select className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white text-slate-900" value={formData.providerId} onChange={(e) => setFormData({...formData, providerId: e.target.value})}>
                <option value="">Qualquer</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
               <Input type="date" label="Data" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="col-span-1">
              <Input type="time" label="Início" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
            </div>
             <div className="col-span-1">
              <Input type="time" label="Fim" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>

          {/* CUSTOM FIELDS RENDERER */}
          {customFormFields.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
               <h4 className="text-sm font-semibold text-slate-700 flex items-center"><List className="w-3 h-3 mr-1"/> Informações Adicionais</h4>
               {customFormFields.map(field => (
                  <div key={field.id}>
                     <label className="block text-xs font-medium text-slate-600 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                     {field.type === 'textarea' ? (
                        <textarea 
                           className="w-full border rounded text-sm p-2 bg-white text-slate-900" 
                           value={formData.customFields[field.id] || ''}
                           onChange={(e) => setFormData({...formData, customFields: { ...formData.customFields, [field.id]: e.target.value }})}
                        />
                     ) : (field.type === 'select') ? (
                        <select
                           className="w-full border rounded text-sm p-2 bg-white text-slate-900"
                           value={formData.customFields[field.id] || ''}
                           onChange={(e) => setFormData({...formData, customFields: { ...formData.customFields, [field.id]: e.target.value }})}
                        >
                           <option value="">Selecione...</option>
                           {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                     ) : (
                        <input 
                           type={field.type} 
                           className="w-full border rounded text-sm p-2 bg-white text-slate-900"
                           value={formData.customFields[field.id] || ''}
                           onChange={(e) => setFormData({...formData, customFields: { ...formData.customFields, [field.id]: e.target.value }})}
                        />
                     )}
                  </div>
               ))}
            </div>
          )}

          {/* FINANCIAL SECTION */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-3">
              <h4 className="text-sm font-semibold text-green-800 flex items-center"><CreditCard className="w-3 h-3 mr-1"/> Pagamento</h4>
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Valor (R$)" type="number" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Método</label>
                    <select className="block w-full rounded-md border-slate-300 text-sm p-2 border bg-white text-slate-900" value={formData.paymentMethod} onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}>
                       <option value="">Selecionar...</option>
                       <option value="pix">Pix</option>
                       <option value="credit_card">Cartão de Crédito</option>
                       <option value="money">Dinheiro</option>
                       <option value="boleto">Boleto</option>
                    </select>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <input type="checkbox" checked={formData.paymentStatus === 'paid'} onChange={(e) => setFormData({...formData, paymentStatus: e.target.checked ? 'paid' : 'pending'})} className="rounded text-green-600 bg-white"/>
                 <label className="text-sm font-medium text-green-800">Pagamento Realizado</label>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status do Agendamento</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(statusConfig).map((key) => {
                 const s = key as AppointmentStatus;
                 const config = statusConfig[s];
                 return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({...formData, status: s})}
                      className={`text-xs p-2 rounded border transition-all ${formData.status === s ? config.color + ' ring-2 ring-offset-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {config.label}
                    </button>
                 )
              })}
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Notas Internas</label>
             <textarea className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white text-slate-900" rows={2} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100"><AlertCircle className="w-4 h-4" />{errorMsg}</div>
          )}
        </div>
        
        <div className="flex justify-between pt-4 border-t border-slate-100 mt-4">
             {editingAppt ? (
               <Button variant="danger" onClick={() => handleDelete(editingAppt.id)}><Trash2 className="w-4 h-4 mr-2"/> Cancelar</Button>
             ) : <div></div>}
             <div className="flex gap-2">
               <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Fechar</Button>
               <Button onClick={handleSave}>Salvar</Button>
             </div>
        </div>
      </Modal>
    </div>
  );
};

export default Schedule;