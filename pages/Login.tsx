import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Building2, User } from 'lucide-react';
import { loginUser } from '../services/storage';
import { Button, Input, Card } from '../components/Shared';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setError('');
    try {
      await loginUser(email, pass);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao entrar');
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(form.email, form.password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          Cronos
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Sistema de Agendamento Inteligente
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="px-4 py-8 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              required
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            
            <Input
              label="Senha"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500">Acesso Rápido (Demo)</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => handleLogin('master@cronos.com', '123456')}
                className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-all"
              >
                <Shield className="h-5 w-5 text-purple-600 mb-1" />
                <span className="text-xs font-medium text-slate-700">Master</span>
              </button>
              
              <button
                onClick={() => handleLogin('admin@empresa.com', '123456')}
                className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-all"
              >
                <Building2 className="h-5 w-5 text-indigo-600 mb-1" />
                <span className="text-xs font-medium text-slate-700">Empresa</span>
              </button>

              <button
                onClick={() => handleLogin('cliente@gmail.com', '123456')}
                className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-indigo-300 transition-all"
              >
                <User className="h-5 w-5 text-emerald-600 mb-1" />
                <span className="text-xs font-medium text-slate-700">Cliente</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;