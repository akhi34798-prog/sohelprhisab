import React, { useState } from 'react';
import { getUsers, saveUser, deleteUser } from '../services/storage';
import { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Shield, Trash2, UserPlus } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.ENTRY_OPERATOR });

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password) return alert("Fill all fields");
    
    const user: User = {
      id: uuidv4(),
      username: newUser.username,
      password: newUser.password,
      role: newUser.role,
      permissions: []
    };
    
    const success = saveUser(user);
    if (success) {
      setUsers(getUsers());
      setNewUser({ username: '', password: '', role: UserRole.ENTRY_OPERATOR });
    } else {
      alert("Username already exists!");
    }
  };

  const removeUser = (id: string) => {
    if (confirm("Delete user?")) {
      deleteUser(id);
      setUsers(getUsers());
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="text-blue-600" size={32} />
        <h2 className="text-3xl font-bold text-gray-800">Admin Panel & User Management</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus size={20} /> Create New User
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 uppercase">Username</label>
            <input 
              type="text" 
              value={newUser.username} 
              onChange={e => setNewUser({...newUser, username: e.target.value})}
              className="w-full p-2 border rounded mt-1"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
            <input 
              type="password" 
              value={newUser.password} 
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              className="w-full p-2 border rounded mt-1"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 uppercase">Role</label>
            <select 
              value={newUser.role} 
              onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
              className="w-full p-2 border rounded mt-1"
            >
              <option value={UserRole.ADMIN}>Admin (Full Access)</option>
              <option value={UserRole.ENTRY_OPERATOR}>Entry Operator (Add/Edit)</option>
              <option value={UserRole.VIEWER}>Viewer (Read Only)</option>
            </select>
          </div>
          <button 
            onClick={handleAddUser}
            className="px-6 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Create
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-600">Username</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Role</th>
              <th className="px-6 py-3 font-semibold text-gray-600">ID</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{u.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                    ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 
                      u.role === UserRole.ENTRY_OPERATOR ? 'bg-green-100 text-green-700' : 
                      'bg-gray-100 text-gray-700'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400 font-mono">{u.id}</td>
                <td className="px-6 py-4 text-right">
                  {u.role !== UserRole.ADMIN && (
                    <button onClick={() => removeUser(u.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;