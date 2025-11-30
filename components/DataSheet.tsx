import React, { useState, useEffect } from 'react';
import { getOrders, updateOrder, deleteOrder, stringToColor, calculateNetProfit } from '../services/storage';
import { Order, OrderStatus } from '../types';
import { Search, Printer, Trash2, Edit2, Check, X } from 'lucide-react';

const DataSheet: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Order>>({});

  useEffect(() => {
    setOrders(getOrders().reverse()); // Show newest first
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteOrder(id);
      setOrders(getOrders().reverse());
    }
  };

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setEditForm({ ...order });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm.id) {
      updateOrder(editForm as Order);
      setOrders(getOrders().reverse());
      setEditingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = orders.filter(o => {
    const matchDate = filterDate ? o.date === filterDate : true;
    const matchPage = filterPage ? o.pageName.toLowerCase().includes(filterPage.toLowerCase()) : true;
    return matchDate && matchPage;
  });

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Order Data Sheet</h2>
        <div className="flex gap-2 no-print">
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            className="p-2 border rounded-lg"
          />
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Page..." 
              value={filterPage} 
              onChange={e => setFilterPage(e.target.value)} 
              className="pl-10 p-2 border rounded-lg w-48"
            />
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Page / Product</th>
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Purchase</th>
              <th className="px-4 py-3">Ad Cost</th>
              <th className="px-4 py-3">Pack+Del</th>
              <th className="px-4 py-3">Mgmt</th>
              <th className="px-4 py-3">Net Profit</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center no-print">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const isEditing = editingId === order.id;
              const profit = calculateNetProfit(order);
              const profitClass = profit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';

              return (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{order.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: stringToColor(order.pageName) }}
                       ></span>
                       <div>
                         <p className="font-medium">{order.pageName}</p>
                         <p className="text-xs text-gray-500">{order.productName}</p>
                       </div>
                    </div>
                  </td>

                  {/* Financial Columns */}
                  {isEditing ? (
                    <>
                      <td className="px-2"><input type="number" className="w-20 border rounded p-1" value={editForm.salePrice} onChange={e => setEditForm({...editForm, salePrice: Number(e.target.value)})} /></td>
                      <td className="px-2"><input type="number" className="w-20 border rounded p-1" value={editForm.purchaseCost} onChange={e => setEditForm({...editForm, purchaseCost: Number(e.target.value)})} /></td>
                      <td className="px-2"><input type="number" className="w-20 border rounded p-1" value={editForm.adCost} onChange={e => setEditForm({...editForm, adCost: Number(e.target.value)})} /></td>
                      <td className="px-2 text-xs">
                        P: <input type="number" className="w-12 border rounded p-1 mb-1" value={editForm.packagingCost} onChange={e => setEditForm({...editForm, packagingCost: Number(e.target.value)})} /><br/>
                        D: <input type="number" className="w-12 border rounded p-1" value={editForm.deliveryCost} onChange={e => setEditForm({...editForm, deliveryCost: Number(e.target.value)})} />
                      </td>
                      <td className="px-2"><input type="number" className="w-20 border rounded p-1" value={editForm.managementCost} onChange={e => setEditForm({...editForm, managementCost: Number(e.target.value)})} /></td>
                      <td className="px-2 font-mono text-gray-400">...</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">৳{order.salePrice}</td>
                      <td className="px-4 py-3">৳{order.purchaseCost}</td>
                      <td className="px-4 py-3 text-gray-500">৳{order.adCost}</td>
                      <td className="px-4 py-3 text-gray-500">৳{order.packagingCost + order.deliveryCost}</td>
                      <td className="px-4 py-3 text-gray-500">৳{order.managementCost}</td>
                      <td className={`px-4 py-3 ${profitClass}`}>৳{profit}</td>
                    </>
                  )}

                  {/* Status */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select 
                        className="border rounded p-1"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as OrderStatus })}
                      >
                         {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 
                          order.status === 'Returned' ? 'bg-red-100 text-red-700' : 
                          'bg-yellow-100 text-yellow-700'}`}>
                        {order.status}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center no-print">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={saveEdit} className="text-green-600"><Check size={18} /></button>
                        <button onClick={cancelEdit} className="text-red-500"><X size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEdit(order)} className="text-blue-500 hover:text-blue-700"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataSheet;