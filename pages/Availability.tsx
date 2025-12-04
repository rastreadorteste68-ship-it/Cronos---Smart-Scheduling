import React, { useEffect, useState } from 'react';
import { Save, Clock, Sun, Moon, Coffee, AlertCircle, Calendar as CalendarIcon, X } from 'lucide-react';
import { WeekAvailability, DaySchedule, DayException } from '../types';
import { getAvailability, saveAvailability, getExceptions, saveException, deleteException } from '../services/storage';
import { Button, Card, Modal } from '../components/Shared';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  startOfWeek,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Helper to create empty schedule
const createEmptySchedule = (): DaySchedule => ({
  active: true,
  intervalMinutes: 60,
  morning: { start: '09:00', end: '12:00', active: true },
  afternoon: { start: '13:00', end: '18:00', active: true },
  night: { start: '19:00', end: '21:00', active: false },
});

const Availability = () => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');
  const [schedule, setSchedule] = useState<WeekAvailability | null>(null);
  const [exceptions, setExceptions] = useState<DayException[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Exception Modal State
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [currentExceptionDate, setCurrentExceptionDate] = useState<Date | null>(null);
  const [currentExceptionData, setCurrentExceptionData] = useState<DaySchedule>(createEmptySchedule());
  
  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());

  const loadData = async () => {
    const [weekData, excData] = await Promise.all([getAvailability(), getExceptions()]);
    setSchedule(weekData);
    setExceptions(excData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Weekly Logic ---

  const handleDayToggle = (dayKey: string) => {
    if (!schedule) return;
    setSchedule({ ...schedule, [dayKey]: { ...schedule[dayKey], active: !schedule[dayKey].active } });
  };

  const updateDaySchedule = (dayKey: string, field: string, value: any) => {
    if (!schedule) return;
    setSchedule({ ...schedule, [dayKey]: { ...schedule[dayKey], [field]: value } });
  };

  const updateTimeRange = (dayKey: string, period: 'morning' | 'afternoon' | 'night', field: 'start' | 'end' | 'active', value: any) => {
    if (!schedule) return;
    setSchedule({ ...schedule, [dayKey]: { ...schedule[dayKey], [period]: { ...schedule[dayKey][period], [field]: value } } });
  };

  const handleSaveWeekly = async () => {
    if (!schedule) return;
    await saveAvailability(schedule);
    alert('Configuração semanal salva!');
  };

  // --- Exceptions Logic ---

  const handleDateClick = (date: Date) => {
    setCurrentExceptionDate(date);
    const existing = exceptions.find(e => e.date === format(date, 'yyyy-MM-dd'));
    if (existing) {
      setCurrentExceptionData(existing.schedule);
    } else {
      // If no exception, pre-fill with weekly schedule for that day as a base
      const dayName = format(date, 'EEEE', { locale: ptBR }).toLowerCase().split('-')[0];
      // English keys mapping simplificado
      const map: Record<string, string> = { 'segunda': 'monday', 'terça': 'tuesday', 'quarta': 'wednesday', 'quinta': 'thursday', 'sexta': 'friday', 'sábado': 'saturday', 'domingo': 'sunday' };
      const key = map[dayName] || 'monday';
      setCurrentExceptionData(schedule && schedule[key] ? JSON.parse(JSON.stringify(schedule[key])) : createEmptySchedule());
    }
    setIsExceptionModalOpen(true);
  };

  const handleSaveException = async () => {
    if (!currentExceptionDate) return;
    const dateStr = format(currentExceptionDate, 'yyyy-MM-dd');
    
    await saveException({
      date: dateStr,
      schedule: currentExceptionData
    });
    
    await loadData();
    setIsExceptionModalOpen(false);
  };

  const handleDeleteException = async () => {
    if (!currentExceptionDate) return;
    const dateStr = format(currentExceptionDate, 'yyyy-MM-dd');
    await deleteException(dateStr);
    await loadData();
    setIsExceptionModalOpen(false);
  };

  // Helper for rendering exception form (reused logic)
  const renderScheduleForm = (data: DaySchedule, onChange: (d: DaySchedule) => void) => {
    const update = (field: keyof DaySchedule, val: any) => onChange({ ...data, [field]: val });
    const updatePeriod = (period: 'morning' | 'afternoon' | 'night', field: string, val: any) => 
       onChange({ ...data, [period]: { ...data[period], [field]: val } });

    return (
       <div className="space-y-4">
          <div className="flex items-center justify-between">
             <span className="font-medium text-slate-700">Dia Ativo?</span>
             <input type="checkbox" checked={data.active} onChange={(e) => update('active', e.target.checked)} className="h-5 w-5 text-indigo-600 rounded bg-white" />
          </div>
          
          {data.active && (
            <div className="space-y-3">
               <div>
                  <label className="text-xs text-slate-500">Intervalo (min)</label>
                  <input type="number" value={data.intervalMinutes} onChange={(e) => update('intervalMinutes', parseInt(e.target.value))} className="block w-full text-sm rounded-md border-slate-300 bg-white text-slate-900" />
               </div>
               {['morning', 'afternoon', 'night'].map((p) => {
                 const period = p as 'morning' | 'afternoon' | 'night';
                 const icons = { morning: Sun, afternoon: Coffee, night: Moon };
                 const labels = { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite' };
                 const Icon = icons[period];
                 
                 return (
                   <div key={p} className="p-3 border rounded bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm font-medium"><Icon className="w-4 h-4 mr-2"/> {labels[period]}</div>
                        <input type="checkbox" checked={data[period].active} onChange={(e) => updatePeriod(period, 'active', e.target.checked)} className="rounded text-indigo-600 bg-white"/>
                      </div>
                      <div className="flex gap-2">
                        <input type="time" className="w-full text-xs rounded border-slate-300 bg-white text-slate-900" value={data[period].start} onChange={(e) => updatePeriod(period, 'start', e.target.value)} disabled={!data[period].active}/>
                        <input type="time" className="w-full text-xs rounded border-slate-300 bg-white text-slate-900" value={data[period].end} onChange={(e) => updatePeriod(period, 'end', e.target.value)} disabled={!data[period].active}/>
                      </div>
                   </div>
                 )
               })}
            </div>
          )}
       </div>
    );
  };

  // Render Calendar
  const renderCalendar = () => {
     const start = startOfMonth(viewDate);
     const end = endOfMonth(viewDate);
     const days = eachDayOfInterval({ start, end });
     const weekStart = startOfWeek(start);
     // Prevent crash if weekStart == start by checking before generating range
     let paddingDays: Date[] = [];
     if (!isSameDay(weekStart, start)) {
        paddingDays = eachDayOfInterval({ start: weekStart, end: addDays(start, -1) });
     }

     return (
       <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900 capitalize">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</h3>
            <div className="flex gap-1">
               <Button variant="ghost" onClick={() => setViewDate(subMonths(viewDate, 1))}>Anterior</Button>
               <Button variant="ghost" onClick={() => setViewDate(addMonths(viewDate, 1))}>Próximo</Button>
            </div>
         </div>
         <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-500 uppercase">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
         </div>
         <div className="grid grid-cols-7 gap-1">
            {paddingDays.map(d => <div key={d.toString()} className="h-24 bg-slate-50 opacity-50"></div>)}
            {days.map(d => {
               const dateKey = format(d, 'yyyy-MM-dd');
               const exception = exceptions.find(e => e.date === dateKey);
               const isTodayDate = isSameDay(d, new Date());
               
               return (
                 <div 
                   key={dateKey} 
                   onClick={() => handleDateClick(d)}
                   className={`h-24 border rounded p-2 text-sm relative cursor-pointer hover:border-indigo-400 transition-colors ${
                     exception 
                        ? (exception.schedule.active ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-200')
                        : 'bg-white border-slate-100'
                   }`}
                 >
                    <span className={`font-semibold ${isTodayDate ? 'text-indigo-600' : 'text-slate-700'}`}>{format(d, 'd')}</span>
                    {exception && (
                       <div className="mt-1">
                          {exception.schedule.active ? (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 font-medium">Especial</span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-orange-100 text-orange-700 font-medium">Fechado</span>
                          )}
                       </div>
                    )}
                 </div>
               )
            })}
         </div>
       </div>
     );
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Disponibilidade</h1>
      </div>

      <div className="border-b border-slate-200">
         <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('weekly')} className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'weekly' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
               Semanal (Padrão)
            </button>
            <button onClick={() => setActiveTab('exceptions')} className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'exceptions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
               Exceções e Feriados
            </button>
         </nav>
      </div>

      {activeTab === 'weekly' ? (
         <div className="space-y-4">
            <div className="flex justify-end">
               <Button onClick={handleSaveWeekly}><Save className="w-4 h-4 mr-2"/> Salvar Padrão</Button>
            </div>
            {daysOfWeek.map((day) => {
               const dayConfig = schedule?.[day.key];
               if (!dayConfig) return null;
               
               return (
                 <Card key={day.key} className={`border p-4 ${dayConfig.active ? 'border-indigo-100' : 'opacity-60'}`}>
                    <div className="flex items-center gap-3 mb-4">
                       <input type="checkbox" checked={dayConfig.active} onChange={() => handleDayToggle(day.key)} className="h-5 w-5 rounded text-indigo-600 bg-white"/>
                       <span className="font-bold text-lg">{day.label}</span>
                    </div>
                    {dayConfig.active && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {['morning', 'afternoon', 'night'].map(p => {
                              const period = p as 'morning' | 'afternoon' | 'night';
                              return (
                                 <div key={p} className="text-sm">
                                    <div className="flex justify-between mb-1">
                                       <span className="capitalize text-slate-500">{p === 'night' ? 'Noite' : p === 'afternoon' ? 'Tarde' : 'Manhã'}</span>
                                       <input type="checkbox" checked={dayConfig[period].active} onChange={(e) => updateTimeRange(day.key, period, 'active', e.target.checked)} className="rounded text-indigo-600 bg-white"/>
                                    </div>
                                    <div className="flex gap-1">
                                       <input type="time" className="border border-slate-300 rounded p-1 w-full bg-white text-slate-900" value={dayConfig[period].start} onChange={(e) => updateTimeRange(day.key, period, 'start', e.target.value)} disabled={!dayConfig[period].active}/>
                                       <input type="time" className="border border-slate-300 rounded p-1 w-full bg-white text-slate-900" value={dayConfig[period].end} onChange={(e) => updateTimeRange(day.key, period, 'end', e.target.value)} disabled={!dayConfig[period].active}/>
                                    </div>
                                 </div>
                              )
                          })}
                       </div>
                    )}
                 </Card>
               );
            })}
         </div>
      ) : (
         <div>
            <div className="mb-4 bg-yellow-50 p-4 rounded-lg text-yellow-800 text-sm flex items-center">
               <AlertCircle className="w-5 h-5 mr-2" />
               As configurações definidas aqui têm prioridade sobre a agenda semanal. Use para feriados ou dias com horário especial.
            </div>
            {renderCalendar()}
         </div>
      )}

      <Modal 
        isOpen={isExceptionModalOpen} 
        onClose={() => setIsExceptionModalOpen(false)} 
        title={currentExceptionDate ? `Configurar ${format(currentExceptionDate, "d 'de' MMMM", {locale: ptBR})}` : 'Configurar Dia'}
      >
         <div className="space-y-6">
            {renderScheduleForm(currentExceptionData, setCurrentExceptionData)}
            <div className="flex justify-between pt-4 border-t border-slate-100">
               <Button variant="danger" onClick={handleDeleteException}><X className="w-4 h-4 mr-2"/> Remover Exceção</Button>
               <Button onClick={handleSaveException}>Salvar Exceção</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default Availability;