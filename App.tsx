import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import DataSheet from './components/DataSheet';
import AdCostManager from './components/AdCostManager';
import SummaryReport from './components/SummaryReport';
import AdminPanel from './components/AdminPanel';
import { User, UserRole } from './types';
import { getUsers } from './services/storage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      setCurrentUser(user);
      setLoginError('');
      // Default tab based on role
      if (user.role === UserRole.ENTRY_OPERATOR) setActiveTab('entry');
      else setActiveTab('dashboard');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg w-96 border border-gray-200">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">E-com Profit Master</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full p-2 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="123"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 transition">
              Login
            </button>
            <div className="text-xs text-center text-gray-400 mt-4">
              Default: admin / 123
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />
      
      <main className="ml-64 flex-1">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'entry' && <EntryForm />}
        {activeTab === 'data' && <DataSheet />}
        {activeTab === 'admanager' && <AdCostManager />}
        {activeTab === 'reports' && <SummaryReport />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;