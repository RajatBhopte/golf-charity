import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Trophy,
  Heart,
  CheckCircle,
  BarChart3,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';

export default function AdminSidebar({ activeTab, setActiveTab, tabs }) {
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = tabs || [
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'draws', name: 'Draw Engine', icon: Trophy },
    { id: 'charities', name: 'Charities', icon: Heart },
    { id: 'winners', name: 'Verification', icon: CheckCircle },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 border-b backdrop-blur-md transition-colors duration-300 ${
        isDark ? 'bg-dark-bg/80 border-dark-border text-white' : 'bg-white/80 border-light-border text-light-text'
      }`}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-bold tracking-tight">Admin<span className="gradient-text">Panel</span></span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-lg ${isDark ? 'hover:bg-dark-card' : 'hover:bg-light-hover'}`}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } border-r flex flex-col ${
        isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-white border-light-border text-light-text shadow-xl lg:shadow-none'
      }`}>
        
        {/* Logo Section */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight uppercase font-sans">
                Admin <span className="gradient-text">Panel</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Control Center</p>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-grow px-4 pb-6 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Core Management</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-dark-hover'
                      : 'text-light-subtext hover:text-light-text hover:bg-light-hover'
                }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                   <Icon size={20} />
                </div>
                <span>{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions Section */}
        <div className={`p-4 mt-auto border-t space-y-2 ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
          
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Preferences</p>
          
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isDark
                ? 'text-gray-400 hover:text-yellow-400 hover:bg-dark-hover'
                : 'text-light-subtext hover:text-amber-500 hover:bg-light-hover border border-transparent'
            }`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'Light Appearance' : 'Dark Appearance'}</span>
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 transition-all ${
              isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50 border border-transparent hover:border-red-100'
            }`}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>

          <div className={`mt-4 p-4 rounded-2xl ${isDark ? 'bg-dark-hover/50' : 'bg-gray-50'} flex items-center gap-3`}>
             <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                <Users size={16} />
             </div>
             <div className="overflow-hidden">
                <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>System Admin</p>
                <p className="text-[10px] text-gray-500 truncate">active session</p>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}
