import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus } from '../types';
import { addOrders } from '../services/storage';
import { Plus, Trash2, FileDown } from 'lucide-react';

const EntryForm: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Batch Rows
  const [rows, setRows] = useState<Partial<Order>[]>([
    { id: uuidv4(), status: OrderStatus.PENDING }
  ]);

  const addRow = () => {
    setRows([...rows, { id: uuidv4(), status: OrderStatus.PENDING, pageName: '', productName: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof Order, value: any) => {
    const newRows = rows.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRows(newRows);
  };

  const handleSubmit = () => {
    const finalOrders: Order[] = rows.map(r => ({
      id: r.id || uuidv4(),
      date: date,
      pageName: r.pageName || 'General',
      productName: r.productName || 'General Product',
      customerName: 'N/A',
      customerPhone: 'N/A',
      salePrice: 0,
      purchaseCost: 0,
      packagingCost: 0,
      deliveryCost: 0,
      status: OrderStatus.PENDING,
      adCost: 0,
      managementCost: 0,
      note: r.note
    }));

    addOrders(finalOrders);
    alert('Order List Saved Successfully!');
    setRows([{ id: uuidv4(), status: OrderStatus.PENDING }]);
  };

  return (
    <div className="p-8 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Quick Order Logger</h2>
        <div className="bg-white p-2 border rounded-lg shadow-sm">
           <label className="text-sm font-semibold text-gray-600 mr-2">Date:</label>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Page Name</th>
              <th className="px-6 py-3">Product Name</th>
              <th className="px-6 py-3">Note / Quantity</th>
              <th className="px-6 py-3 w-16">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input 
                    type="text" 
                    value={row.pageName} 
                    onChange={e => updateRow(row.id!, 'pageName', e.target.value)} 
                    className="w-full p-2 border rounded" 
                    placeholder="Enter Page Name" 
                  />
                </td>
                <td className="p-3">
                  <input 
                    type="text" 
                    value={row.productName} 
                    onChange={e => updateRow(row.id!, 'productName', e.target.value)} 
                    className="w-full p-2 border rounded" 
                    placeholder="Enter Product Name" 
                  />
                </td>
                <td className="p-3">
                   <input 
                    type="text" 
                    value={row.note} 
                    onChange={e => updateRow(row.id!, 'note', e.target.value)} 
                    className="w-full p-2 border rounded" 
                    placeholder="Optional Note" 
                   />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => removeRow(row.id!)} className="text-red-500 hover:text-red-700 p-2">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-center">
          <button onClick={addRow} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={20} /> Add New Row
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 w-full md:w-[calc(100%-16rem)] p-4 bg-white border-t shadow-lg flex justify-end gap-4 z-10">
        <div className="flex-1 flex items-center text-sm font-semibold text-gray-700 px-4">
          Total Count: {rows.length}
        </div>
        <button onClick={() => setRows([{ id: uuidv4(), status: OrderStatus.PENDING }])} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
          Reset
        </button>
        <button onClick={handleSubmit} className="px-8 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shadow-md flex items-center gap-2">
          <FileDown size={20} /> Save List
        </button>
      </div>
    </div>
  );
};

export default EntryForm;