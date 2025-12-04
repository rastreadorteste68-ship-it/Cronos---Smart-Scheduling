import React, { useEffect, useState } from 'react';
import { getAppointments, getClients } from '../services/storage';
import { Appointment, Client } from '../types';
import { Card, Badge } from '../components/Shared';
import { Calendar, Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { format, isToday, parseISO, startOfToday, compareAsc } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayCount: 0,
    totalClients: 0,
    upcoming: [] as Appointment[],
    chartData: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [appts, clients] = await Promise.all([getAppointments(), getClients()]);
      
      const today = startOfToday();
      const todayAppts = appts.filter(a => isToday(parseISO(a.start)));
      
      // Filter upcoming: status not cancelled, start date > now, sort by date, take 5
      const upcoming = appts
        .filter(a => parseISO(a.start) >= new Date() && a.status !== 'cancelled')
        .sort((a, b) => compareAsc(parseISO(a.start), parseISO(b.start)))
        .slice(0, 5);

      // Simple chart data: Appts per day for next 7 days
      const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayStr = format(d, 'yyyy-MM-dd');
        const count = appts.filter(a => a.start.startsWith(dayStr) && a.status !== 'cancelled').length;
        return {
          name: format(d, 'EEE', { locale: ptBR }),
          agendamentos: count
        };
      });

      setStats({
        todayCount: todayAppts.length,
        totalClients: clients.length,
        upcoming,
        chartData
      });
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <div className="text-sm text-slate-500">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Hoje', value: stats.todayCount, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Clientes Ativos', value: stats.totalClients, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Taxa de Ocupação', value: '85%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pendente', value: '3', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, i) => (
          <Card key={i} className="p-5 flex items-center">
            <div className={`flex-shrink-0 rounded-lg p-3 ${item.bg}`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-slate-500">{item.label}</dt>
                <dd className="text-2xl font-bold text-slate-900">{item.value}</dd>
              </dl>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-6">Agendamentos da Semana</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  hide 
                />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="agendamentos" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Upcoming List */}
        <Card>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-900">Próximos Horários</h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              {stats.upcoming.length} agendados
            </span>
          </div>
          <ul className="divide-y divide-slate-100">
            {stats.upcoming.length === 0 ? (
              <li className="p-6 text-center text-slate-500 text-sm">Nenhum agendamento próximo.</li>
            ) : (
              stats.upcoming.map((appt) => (
                <li key={appt.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{appt.title}</span>
                      <span className="text-xs text-slate-500 mt-1">
                        {format(parseISO(appt.start), "d 'de' MMM • HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <Badge color="green">Confirmado</Badge>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;