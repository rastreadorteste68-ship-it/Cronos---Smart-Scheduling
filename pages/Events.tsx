
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Users, Video, Edit2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Event, Client } from '../types';
import { getEvents, saveEvent, deleteEvent, getClients } from '../services/storage';
import { Button, Input, Modal, Card } from '../components/Shared';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event>({
    id: '',
    name: '',
    date: new Date().toISOString(),
    durationMinutes: 60,
    capacity: 20,
    attendees: []
  });

  const loadData = async () => {
    const [e, c] = await Promise.all([getEvents(), getClients()]);
    setEvents(e);
    setClients(c);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (evt?: Event) => {
    if (evt) {
      setCurrentEvent(evt);
    } else {
      setCurrentEvent({
        id: '',
        name: '',
        date: new Date().toISOString().slice(0, 16),
        durationMinutes: 60,
        capacity: 20,
        attendees: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const newEvent = { ...currentEvent, id: currentEvent.id || crypto.randomUUID() };
    await saveEvent(newEvent);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Excluir evento?')) {
      await deleteEvent(id);
      loadData();
    }
  };

  const toggleAttendee = (clientId: string) => {
    const attendees = currentEvent.attendees.includes(clientId)
      ? currentEvent.attendees.filter(id => id !== clientId)
      : [...currentEvent.attendees, clientId];
    setCurrentEvent({...currentEvent, attendees});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Eventos & Palestras</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(evt => (
          <Card key={evt.id} className="flex flex-col h-full">
             <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                   <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                      <Calendar className="w-6 h-6" />
                   </div>
                   <div className="flex gap-2">
                       <Button variant="ghost" className="p-2" onClick={() => handleOpenModal(evt)}><Edit2 className="w-4 h-4"/></Button>
                       <button onClick={() => handleDelete(evt.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                   </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{evt.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{evt.description || 'Sem descrição.'}</p>
                
                <div className="space-y-2 text-sm text-slate-600">
                   <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400"/>
                      {format(parseISO(evt.date), "dd/MM/yyyy 'às' HH:mm", {locale: ptBR})}
                   </div>
                   <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400"/>
                      {evt.attendees.length} / {evt.capacity} inscritos
                   </div>
                   {evt.meetingUrl && (
                      <div className="flex items-center gap-2 text-indigo-600 truncate">
                         <Video className="w-4 h-4"/>
                         <a href={evt.meetingUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">{evt.meetingUrl}</a>
                      </div>
                   )}
                </div>
             </div>
             <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                 <span className={`text-xs font-semibold px-2 py-1 rounded-full ${evt.attendees.length >= evt.capacity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {evt.attendees.length >= evt.capacity ? 'Lotado' : 'Inscrições Abertas'}
                 </span>
             </div>
          </Card>
        ))}
        {events.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-xl">
              Nenhum evento agendado.
           </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentEvent.id ? 'Editar Evento' : 'Novo Evento'}>
         <div className="space-y-4">
            <Input label="Nome do Evento" value={currentEvent.name} onChange={e => setCurrentEvent({...currentEvent, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
               <Input type="datetime-local" label="Data e Hora" value={currentEvent.date.slice(0, 16)} onChange={e => setCurrentEvent({...currentEvent, date: e.target.value})} />
               <Input type="number" label="Duração (min)" value={currentEvent.durationMinutes} onChange={e => setCurrentEvent({...currentEvent, durationMinutes: parseInt(e.target.value)})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <Input type="number" label="Capacidade Máxima" value={currentEvent.capacity} onChange={e => setCurrentEvent({...currentEvent, capacity: parseInt(e.target.value)})} />
               <Input label="Link da Reunião (Zoom/Meet)" value={currentEvent.meetingUrl || ''} onChange={e => setCurrentEvent({...currentEvent, meetingUrl: e.target.value})} placeholder="https://..." />
            </div>

            <Input label="Palestrante / Responsável" value={currentEvent.speaker || ''} onChange={e => setCurrentEvent({...currentEvent, speaker: e.target.value})} />
            
            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
               <textarea className="w-full border rounded-md p-2 text-sm" rows={3} value={currentEvent.description || ''} onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})} />
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Lista de Inscritos</label>
               <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {clients.map(client => (
                     <div key={client.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded">
                        <input 
                          type="checkbox" 
                          checked={currentEvent.attendees.includes(client.id)} 
                          onChange={() => toggleAttendee(client.id)}
                          className="rounded text-indigo-600"
                        />
                        <span className="text-sm text-slate-700">{client.name}</span>
                     </div>
                  ))}
               </div>
            </div>
            
            <div className="flex justify-end pt-4">
               <Button onClick={handleSave}>Salvar Evento</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default EventsPage;
