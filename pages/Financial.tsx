
import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Download, FileText, CreditCard } from 'lucide-react';
import { Transaction, Appointment } from '../types';
import { getTransactions, getAppointments } from '../services/storage';
import { Card, Button, Badge } from '../components/Shared';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const FinancialPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date());

  const loadData = async () => {
    const txs = await getTransactions();
    setTransactions(txs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculations
  const start = startOfMonth(filterMonth);
  const end = endOfMonth(filterMonth);
  
  const filteredTxs = transactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
  
  const income = filteredTxs.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const expense = filteredTxs.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
  const pending = filteredTxs.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  // Chart Data
  const paymentMethodsData = Object.entries(filteredTxs.reduce((acc, curr) => {
      const method = curr.paymentMethod || 'Outros';
      acc[method] = (acc[method] || 0) + curr.amount;
      return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExport = () => {
     const csvContent = "data:text/csv;charset=utf-8," 
        + "Data,Descrição,Tipo,Valor,Método,Status\n"
        + filteredTxs.map(t => `${format(parseISO(t.date), 'dd/MM/yyyy')},${t.description},${t.type},${t.amount},${t.paymentMethod || '-'},${t.status}`).join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `extrato_${format(filterMonth, 'MM_yyyy')}.csv`);
     document.body.appendChild(link);
     link.click();
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <div className="flex gap-2 items-center">
             <input 
                type="month" 
                className="border rounded-md px-3 py-2 text-sm"
                value={format(filterMonth, 'yyyy-MM')}
                onChange={(e) => setFilterMonth(parseISO(e.target.value + '-01'))}
             />
             <Button variant="secondary" onClick={handleExport}><Download className="w-4 h-4 mr-2"/> Exportar</Button>
          </div>
       </div>

       {/* Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-emerald-50 border-emerald-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingUp className="w-6 h-6 text-emerald-600"/></div>
                <div>
                   <p className="text-sm text-slate-500 font-medium">Receitas</p>
                   <p className="text-2xl font-bold text-emerald-700">R$ {income.toFixed(2)}</p>
                </div>
             </div>
          </Card>
          <Card className="p-4 bg-red-50 border-red-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm"><TrendingDown className="w-6 h-6 text-red-600"/></div>
                <div>
                   <p className="text-sm text-slate-500 font-medium">Despesas</p>
                   <p className="text-2xl font-bold text-red-700">R$ {expense.toFixed(2)}</p>
                </div>
             </div>
          </Card>
          <Card className="p-4 bg-amber-50 border-amber-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm"><FileText className="w-6 h-6 text-amber-600"/></div>
                <div>
                   <p className="text-sm text-slate-500 font-medium">Pendente</p>
                   <p className="text-2xl font-bold text-amber-700">R$ {pending.toFixed(2)}</p>
                </div>
             </div>
          </Card>
          <Card className="p-4 bg-indigo-50 border-indigo-100">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm"><DollarSign className="w-6 h-6 text-indigo-600"/></div>
                <div>
                   <p className="text-sm text-slate-500 font-medium">Saldo</p>
                   <p className="text-2xl font-bold text-indigo-700">R$ {balance.toFixed(2)}</p>
                </div>
             </div>
          </Card>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="lg:col-span-2">
             <div className="p-4 border-b border-slate-100 font-semibold text-slate-900">Extrato do Mês</div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                         <th className="px-4 py-3">Data</th>
                         <th className="px-4 py-3">Descrição</th>
                         <th className="px-4 py-3">Método</th>
                         <th className="px-4 py-3">Status</th>
                         <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredTxs.map(tx => (
                         <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-500">{format(parseISO(tx.date), 'dd/MM')}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{tx.description}</td>
                            <td className="px-4 py-3 capitalize">{tx.paymentMethod?.replace('_', ' ') || '-'}</td>
                            <td className="px-4 py-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${tx.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{tx.status === 'paid' ? 'Pago' : 'Pendente'}</span>
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                               {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                            </td>
                         </tr>
                      ))}
                      {filteredTxs.length === 0 && (
                         <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhuma transação neste período.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </Card>

          {/* Chart */}
          <Card className="p-4 flex flex-col items-center justify-center">
             <h3 className="text-sm font-semibold text-slate-900 mb-4 self-start">Métodos de Pagamento</h3>
             <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={paymentMethodsData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {paymentMethodsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex flex-wrap gap-2 justify-center mt-4">
                {paymentMethodsData.map((entry, index) => (
                   <div key={entry.name} className="flex items-center text-xs text-slate-600">
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="capitalize">{entry.name}</span>
                   </div>
                ))}
             </div>
          </Card>
       </div>
    </div>
  );
};

export default FinancialPage;
