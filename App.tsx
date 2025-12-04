import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  LogOut, 
  Menu,
  Sparkles,
  Clock,
  Settings,
  Presentation,
  DollarSign
} from 'lucide-react';
import { seedData, getCurrentUser, logoutUser } from './services/storage';
import { User, Role } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Clients from './pages/Clients';
import Availability from './pages/Availability';
import SettingsPage from './pages/Settings';
import EventsPage from './pages/Events';
import FinancialPage from './pages/Financial';

// Sidebar Component
const Sidebar: React.FC<{ mobileOpen: boolean, setMobileOpen: (o: boolean) => void }> = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const user = getCurrentUser();
  const role = user?.role || 'CLIENTE';

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
    { icon: CalendarIcon, label: 'Agenda', path: '/schedule', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN', 'CLIENTE'] },
    { icon: Users, label: 'Clientes', path: '/clients', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
    { icon: Presentation, label: 'Eventos', path: '/events', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
    { icon: DollarSign, label: 'Financeiro', path: '/financial', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
    { icon: Clock, label: 'Disponibilidade', path: '/availability', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
    { icon: Settings, label: 'Configurações', path: '/settings', roles: ['MASTER_ADMIN', 'EMPRESA_ADMIN'] },
  ];

  const handleLogout = () => {
    logoutUser().then(() => window.location.reload());
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <Sparkles className="h-6 w-6 text-indigo-600 mr-2" />
            <span className="text-xl font-bold text-slate-900">Cronos</span>
          </div>
          
          <div className="px-6 py-4 border-b border-slate-50">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs overflow-hidden">
                 {user?.avatar ? <img src={user.avatar} alt="avatar" /> : user?.name.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate capitalize">{role.replace('_', ' ').toLowerCase()}</p>
               </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.filter(item => item.roles.includes(role)).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.path) 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// Protected Layout
const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 h-16">
          <div className="flex items-center">
            <Sparkles className="h-6 w-6 text-indigo-600 mr-2" />
            <span className="text-lg font-bold text-slate-900">Cronos</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-2 text-slate-600">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children?: React.ReactNode, allowedRoles?: Role[] }> = ({ children, allowedRoles }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
     return <Navigate to="/schedule" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App = () => {
  useEffect(() => {
    seedData();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/schedule" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN', 'CLIENTE']}>
            <Schedule />
          </ProtectedRoute>
        } />
        
        <Route path="/clients" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <Clients />
          </ProtectedRoute>
        } />

        <Route path="/events" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <EventsPage />
          </ProtectedRoute>
        } />

        <Route path="/financial" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <FinancialPage />
          </ProtectedRoute>
        } />

        <Route path="/availability" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <Availability />
          </ProtectedRoute>
        } />

         <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['MASTER_ADMIN', 'EMPRESA_ADMIN']}>
            <SettingsPage />
          </ProtectedRoute>
        } />

      </Routes>
    </HashRouter>
  );
};

export default App;