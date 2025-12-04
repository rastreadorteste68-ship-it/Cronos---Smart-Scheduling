import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Scissors, UserCheck, DollarSign, Clock, FileText, CheckSquare, AlignLeft, Hash } from 'lucide-react';
import { Service, Provider, CustomField, CustomFieldType } from '../types';
import { getServices, saveService, deleteService, getProviders, saveProvider, deleteProvider, getFormConfig, saveFormConfig } from '../services/storage';
import { Button, Card, Input, Modal } from '../components/Shared';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'providers' | 'form'>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState<Service>({ id: '', name: '', durationMinutes: 60, price: 0, active: true });
  
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<Provider>({ id: '', name: '', active: true });

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState<CustomField>({ id: '', label: '', type: 'text', required: false, options: [] });
  const [optionsText, setOptionsText] = useState('');

  const loadData = async () => {
    const [s, p, f] = await Promise.all([getServices(), getProviders(), getFormConfig()]);
    setServices(s);
    setProviders(p);
    setCustomFields(f);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Services Logic
  const handleEditService = (s?: Service) => {
    setServiceForm(s || { id: '', name: '', durationMinutes: 30, price: 0, active: true });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    const newService = { ...serviceForm, id: serviceForm.id || crypto.randomUUID() };
    await saveService(newService);
    loadData();
    setIsServiceModalOpen(false);
  };

  const handleDeleteService = async (id: string) => {
    if(confirm('Excluir serviço?')) {
       await deleteService(id);
       loadData();
    }
  };

  // Providers Logic
  const handleEditProvider = (p?: Provider) => {
    setProviderForm(p || { id: '', name: '', active: true });
    setIsProviderModalOpen(true);
  };

  const handleSaveProvider = async () => {
    const newProvider = { ...providerForm, id: providerForm.id || crypto.randomUUID() };
    await saveProvider(newProvider);
    loadData();
    setIsProviderModalOpen(false);
  };

  const handleDeleteProvider = async (id: string) => {
    if(confirm('Excluir prestador?')) {
       await deleteProvider(id);
       loadData();
    }
  };

  // Custom Fields Logic
  const handleEditField = (f?: CustomField) => {
    if (f) {
      setFieldForm(f);
      setOptionsText(f.options ? f.options.join(', ') : '');
    } else {
      setFieldForm({ id: '', label: '', type: 'text', required: false, options: [] });
      setOptionsText('');
    }
    setIsFieldModalOpen(true);
  };

  const handleSaveField = async () => {
    const options = fieldForm.type === 'select' || fieldForm.type === 'checkbox' 
      ? optionsText.split(',').map(s => s.trim()).filter(Boolean) 
      : undefined;

    const newField = { ...fieldForm, id: fieldForm.id || crypto.randomUUID(), options };
    
    // Save locally to state then persist
    const newFields = fieldForm.id 
      ? customFields.map(f => f.id === fieldForm.id ? newField : f)
      : [...customFields, newField];
    
    await saveFormConfig(newFields);
    loadData();
    setIsFieldModalOpen(false);
  };

  const handleDeleteField = async (id: string) => {
    if(confirm('Remover este campo do formulário?')) {
       const newFields = customFields.filter(f => f.id !== id);
       await saveFormConfig(newFields);
       loadData();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Configurações do Negócio</h1>
      
      <div className="border-b border-slate-200">
         <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button onClick={() => setActiveTab('services')} className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'services' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <Scissors className="w-4 h-4 mr-2"/> Serviços
            </button>
            <button onClick={() => setActiveTab('providers')} className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'providers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <UserCheck className="w-4 h-4 mr-2"/> Profissionais
            </button>
            <button onClick={() => setActiveTab('form')} className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'form' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>
               <FileText className="w-4 h-4 mr-2"/> Formulário Personalizado
            </button>
         </nav>
      </div>

      {activeTab === 'services' && (
        <div className="space-y-4">
           <div className="flex justify-end">
              <Button onClick={() => handleEditService()}><Plus className="w-4 h-4 mr-2"/> Novo Serviço</Button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(svc => (
                 <Card key={svc.id} className="p-4 flex items-center justify-between">
                    <div>
                       <h3 className="font-semibold text-slate-900">{svc.name}</h3>
                       <div className="flex gap-4 text-sm text-slate-500 mt-1">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {svc.durationMinutes} min</span>
                          <span className="flex items-center"><DollarSign className="w-3 h-3 mr-1"/> R$ {svc.price}</span>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="ghost" onClick={() => handleEditService(svc)}>Editar</Button>
                       <button onClick={() => handleDeleteService(svc.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 </Card>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-4">
           <div className="flex justify-end">
              <Button onClick={() => handleEditProvider()}><Plus className="w-4 h-4 mr-2"/> Novo Profissional</Button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map(prov => (
                 <Card key={prov.id} className="p-4">
                    <div className="flex items-center space-x-3 mb-4">
                       <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {prov.name.charAt(0)}
                       </div>
                       <div>
                          <h3 className="font-semibold text-slate-900">{prov.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${prov.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                             {prov.active ? 'Ativo' : 'Inativo'}
                          </span>
                       </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
                       <Button variant="ghost" className="text-xs" onClick={() => handleEditProvider(prov)}>Editar</Button>
                       <button onClick={() => handleDeleteProvider(prov.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </div>
                 </Card>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'form' && (
        <div className="space-y-4">
           <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-lg">
             <p className="text-sm text-indigo-800">
               Configure os campos extras que serão solicitados aos clientes no momento do agendamento.
             </p>
             <Button onClick={() => handleEditField()}><Plus className="w-4 h-4 mr-2"/> Adicionar Campo</Button>
           </div>
           
           <div className="space-y-3">
              {customFields.length === 0 && <p className="text-slate-500 text-center py-8">Nenhum campo personalizado configurado.</p>}
              {customFields.map(field => (
                <Card key={field.id} className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-100 rounded text-slate-600">
                        {field.type === 'text' && <AlignLeft className="w-5 h-5"/>}
                        {field.type === 'number' && <Hash className="w-5 h-5"/>}
                        {(field.type === 'select' || field.type === 'checkbox') && <CheckSquare className="w-5 h-5"/>}
                      </div>
                      <div>
                         <h4 className="font-medium text-slate-900">{field.label}</h4>
                         <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="uppercase bg-slate-100 px-1 rounded">{field.type}</span>
                            {field.required && <span className="text-red-500 font-bold">Obrigatório</span>}
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => handleEditField(field)}>Editar</Button>
                      <button onClick={() => handleDeleteField(field.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                   </div>
                </Card>
              ))}
           </div>
        </div>
      )}

      {/* Service Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title="Gerenciar Serviço">
         <div className="space-y-4">
            <Input label="Nome do Serviço" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} placeholder="Ex: Corte Masculino"/>
            <div className="grid grid-cols-2 gap-4">
               <Input label="Duração (min)" type="number" value={serviceForm.durationMinutes} onChange={e => setServiceForm({...serviceForm, durationMinutes: parseInt(e.target.value)})}/>
               <Input label="Preço (R$)" type="number" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: parseFloat(e.target.value)})}/>
            </div>
            <div className="flex items-center gap-2">
               <input type="checkbox" checked={serviceForm.active} onChange={e => setServiceForm({...serviceForm, active: e.target.checked})} className="rounded text-indigo-600 bg-white"/>
               <label className="text-sm text-slate-700">Serviço Ativo</label>
            </div>
            <div className="flex justify-end pt-4">
               <Button onClick={handleSaveService}>Salvar</Button>
            </div>
         </div>
      </Modal>

      {/* Provider Modal */}
      <Modal isOpen={isProviderModalOpen} onClose={() => setIsProviderModalOpen(false)} title="Gerenciar Profissional">
         <div className="space-y-4">
            <Input label="Nome Completo" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name: e.target.value})}/>
            <Input label="Email (Opcional)" value={providerForm.email || ''} onChange={e => setProviderForm({...providerForm, email: e.target.value})}/>
            <div className="flex items-center gap-2">
               <input type="checkbox" checked={providerForm.active} onChange={e => setProviderForm({...providerForm, active: e.target.checked})} className="rounded text-indigo-600 bg-white"/>
               <label className="text-sm text-slate-700">Profissional Disponível</label>
            </div>
            <div className="flex justify-end pt-4">
               <Button onClick={handleSaveProvider}>Salvar</Button>
            </div>
         </div>
      </Modal>

      {/* Custom Field Modal */}
      <Modal isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)} title="Campo Personalizado">
        <div className="space-y-4">
           <Input label="Rótulo (Pergunta)" value={fieldForm.label} onChange={e => setFieldForm({...fieldForm, label: e.target.value})} placeholder="Ex: Tem alergias?"/>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Resposta</label>
              <select 
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white text-slate-900"
                value={fieldForm.type}
                onChange={e => setFieldForm({...fieldForm, type: e.target.value as CustomFieldType})}
              >
                <option value="text">Texto Curto</option>
                <option value="textarea">Texto Longo</option>
                <option value="number">Número</option>
                <option value="email">E-mail</option>
                <option value="phone">Telefone</option>
                <option value="checkbox">Checkbox (Múltipla Escolha)</option>
                <option value="select">Seleção (Lista)</option>
              </select>
           </div>
           
           {(fieldForm.type === 'select' || fieldForm.type === 'checkbox') && (
              <Input 
                 label="Opções (separadas por vírgula)" 
                 value={optionsText} 
                 onChange={e => setOptionsText(e.target.value)} 
                 placeholder="Opção A, Opção B, Opção C"
              />
           )}

           <div className="flex items-center gap-2">
              <input type="checkbox" checked={fieldForm.required} onChange={e => setFieldForm({...fieldForm, required: e.target.checked})} className="rounded text-indigo-600 bg-white"/>
              <label className="text-sm text-slate-700">Campo Obrigatório</label>
           </div>

           <div className="flex justify-end pt-4">
              <Button onClick={handleSaveField}>Salvar Campo</Button>
           </div>
        </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;