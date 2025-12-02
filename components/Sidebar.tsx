import React from 'react';
import { LayoutDashboard, FileInput, Table, PieChart, Users, LogOut, TrendingUp, Calculator } from 'lucide-react';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.VIEWER, UserRole.ENTRY_OPERATOR] },
    { id: 'entry', label: 'Order Entry (Single)', icon: FileInput, roles: [UserRole.ADMIN, UserRole.ENTRY_OPERATOR] },
    { id: 'data', label: 'Data Sheet (Orders)', icon: Table, roles: [UserRole.ADMIN, UserRole.VIEWER, UserRole.ENTRY_OPERATOR] },
    { id: 'analysis', label: 'Profit Analysis', icon: Calculator, roles: [UserRole.ADMIN, UserRole.ENTRY_OPERATOR] },
    { id: 'admanager', label: 'Ad Cost Manager', icon: TrendingUp, roles: [UserRole.ADMIN, UserRole.ENTRY_OPERATOR] },
    { id: 'reports', label: 'Summary Report', icon: PieChart, roles: [UserRole.ADMIN, UserRole.VIEWER] },
    { id: 'admin', label: 'Admin Panel', icon: Users, roles: [UserRole.ADMIN] },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col no-print">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold tracking-wider">PROFIT MASTER</h1>
        <p className="text-xs text-slate-400 mt-1">E-com Management Tool</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.roles.includes(currentUser.role)) return null;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold">{currentUser.username}</p>
          <p className="text-xs text-slate-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;