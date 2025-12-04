import React, { useEffect, useState } from 'react';
import { Search, Plus, Phone, Mail, User, Trash2 } from 'lucide-react';
import { Client } from '../types';
import { getClients, saveClient, deleteClient } from '../services/storage';
import { Button, Input, Modal, Card } from '../components/Shared';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Client>({
    id: '',
    name: '',
    email: '',
    phone: '',
    createdAt: ''
  });

  const loadClients = async () => {
    const data = await getClients();
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setForm(client);
    } else {
      setForm({
        id: '',
        name: '',
        email: '',
        phone: '',
        createdAt: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const newClient = { ...form, id: form.id || crypto.randomUUID() };
    await saveClient(newClient);
    await loadClients();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Excluir cliente?')) {
      await deleteClient(id);
      loadClients();
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou email..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <Card key={client.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{client.name}</h3>
                  <p className="text-xs text-slate-500">Cadastrado em {new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-slate-600">
                <Mail className="w-4 h-4 mr-2 text-slate-400" />
                {client.email}
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Phone className="w-4 h-4 mr-2 text-slate-400" />
                {client.phone}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <Button variant="ghost" className="w-full text-indigo-600 hover:bg-indigo-50" onClick={() => handleOpenModal(client)}>
                Editar Detalhes
              </Button>
            </div>
          </Card>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={form.id ? 'Editar Cliente' : 'Novo Cliente'}>
        <div className="space-y-4">
          <Input 
            label="Nome Completo" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
          />
          <Input 
            label="Email" 
            type="email" 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})} 
          />
          <Input 
            label="Telefone" 
            value={form.phone} 
            onChange={e => setForm({...form, phone: e.target.value})} 
            placeholder="(11) 99999-9999"
          />
          <div className="flex justify-end pt-4">
            <Button variant="secondary" className="mr-2" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Cliente</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Clients;