import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus, CostTemplate } from '../types';
import { addOrders, getTemplates, saveTemplate, deleteTemplate } from '../services/storage';
import { Plus, Trash2, Save, FileDown, Calculator } from 'lucide-react';

const EntryForm: React.FC = () => {
  // Global Daily Costs
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dollarRate, setDollarRate] = useState(120);
  const [adSpendDollar, setAdSpendDollar] = useState(0);
  const [officeCost, setOfficeCost] = useState(0);
  const [salaryCost, setSalaryCost] = useState(0);

  // Batch Rows
  const [rows, setRows] = useState<Partial<Order>[]>([
    { id: uuidv4(), status: OrderStatus.PENDING }
  ]);

  // Templates
  const [templates, setTemplates] = useState<CostTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  // --- Handlers ---

  const handleGlobalCalculation = () => {
    return (adSpendDollar * dollarRate);
  };

  const addRow = () => {
    setRows([...rows, { id: uuidv4(), status: OrderStatus.PENDING, pageName: '', productName: '', salePrice: 0, purchaseCost: 0, packagingCost: 0, deliveryCost: 0 }]);
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

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    const newRows = rows.map(r => ({
      ...r,
      pageName: template.pageName,
      productName: template.productName || r.productName,
      purchaseCost: template.purchaseCost || r.purchaseCost,
      packagingCost: template.packagingCost,
      deliveryCost: template.deliveryCost
    }));
    setRows(newRows);
  };

  const saveCurrentAsTemplate = () => {
    if (!newTemplateName) return alert("Enter a template name");
    // Take the first row as reference
    const ref = rows[0];
    const newTemplate: CostTemplate = {
      id: uuidv4(),
      name: newTemplateName,
      pageName: ref.pageName || 'Unknown Page',
      packagingCost: ref.packagingCost || 0,
      deliveryCost: ref.deliveryCost || 0,
      productName: ref.productName,
      purchaseCost: ref.purchaseCost
    };
    saveTemplate(newTemplate);
    setTemplates(getTemplates());
    setNewTemplateName('');
    alert("Template Saved!");
  };

  const handleSubmit = () => {
    const totalAdSpendBDT = handleGlobalCalculation();
    const totalOrders = rows.length;

    if (totalOrders === 0) return;

    // Distribute costs
    const adCostPerOrder = totalOrders > 0 ? totalAdSpendBDT / totalOrders : 0;
    const managementCostPerOrder = totalOrders > 0 ? (Number(officeCost) + Number(salaryCost)) / totalOrders : 0;

    const finalOrders: Order[] = rows.map(r => ({
      id: r.id || uuidv4(),
      date: date,
      pageName: r.pageName || 'General',
      productName: r.productName || 'General Product',
      customerName: r.customerName || 'N/A',
      customerPhone: r.customerPhone || 'N/A',
      salePrice: Number(r.salePrice) || 0,
      purchaseCost: Number(r.purchaseCost) || 0,
      packagingCost: Number(r.packagingCost) || 0,
      deliveryCost: Number(r.deliveryCost) || 0,
      status: r.status || OrderStatus.PENDING,
      adCost: Math.round(adCostPerOrder),
      managementCost: Math.round(managementCostPerOrder),
      note: r.note
    }));

    addOrders(finalOrders);
    alert('Batch Entry Saved Successfully!');
    // Reset form
    setRows([{ id: uuidv4(), status: OrderStatus.PENDING }]);
    setAdSpendDollar(0);
    setOfficeCost(0);
  };

  return (
    <div className="p-8 pb-32"> {/* Added pb-32 for sticky footer space */}
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Batch Order Entry</h2>

      {/* Global Cost Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
          <Calculator size={20} /> Daily Global Costs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dollar Rate</label>
            <input type="number" value={dollarRate} onChange={e => setDollarRate(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Spend ($)</label>
            <input type="number" value={adSpendDollar} onChange={e => setAdSpendDollar(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary/Mgmt Cost (৳)</label>
            <input type="number" value={salaryCost} onChange={e => setSalaryCost(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office/Misc Cost (৳)</label>
            <input type="number" value={officeCost} onChange={e => setOfficeCost(Number(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
          Total Ad Spend: ৳ {(adSpendDollar * dollarRate).toLocaleString()} | 
          Per Order Cost Estimate: ৳ {rows.length > 0 ? Math.round(((adSpendDollar * dollarRate) + salaryCost + officeCost) / rows.length) : 0}
        </div>
      </div>

      {/* Template Manager */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-end bg-gray-100 p-4 rounded-lg">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Load Template</label>
          <div className="flex gap-2">
            <select 
              value={selectedTemplateId} 
              onChange={(e) => setSelectedTemplateId(e.target.value)} 
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Select a template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.pageName})</option>
              ))}
            </select>
            <button 
              onClick={() => applyTemplate(selectedTemplateId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Load
            </button>
            <button 
               onClick={() => {
                 if(selectedTemplateId) {
                   deleteTemplate(selectedTemplateId);
                   setTemplates(getTemplates());
                   setSelectedTemplateId('');
                 }
               }}
               className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex gap-2">
           <input 
             type="text" 
             placeholder="New Template Name" 
             value={newTemplateName} 
             onChange={e => setNewTemplateName(e.target.value)}
             className="flex-1 p-2 border rounded-lg"
           />
           <button 
             onClick={saveCurrentAsTemplate}
             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
           >
             <Save size={16} /> Save
           </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Page Name</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Customer (Opt)</th>
              <th className="px-4 py-3 w-24">Sale (৳)</th>
              <th className="px-4 py-3 w-24">Cost (৳)</th>
              <th className="px-4 py-3 w-24">Pack (৳)</th>
              <th className="px-4 py-3 w-24">Del (৳)</th>
              <th className="px-4 py-3 w-32">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <input type="text" value={row.pageName} onChange={e => updateRow(row.id!, 'pageName', e.target.value)} className="w-full p-1 border rounded" placeholder="Page" />
                </td>
                <td className="p-2">
                  <input type="text" value={row.productName} onChange={e => updateRow(row.id!, 'productName', e.target.value)} className="w-full p-1 border rounded" placeholder="Product" />
                </td>
                <td className="p-2">
                   <input type="text" value={row.customerName} onChange={e => updateRow(row.id!, 'customerName', e.target.value)} className="w-full p-1 border rounded" placeholder="Name" />
                </td>
                <td className="p-2">
                  <input type="number" value={row.salePrice} onChange={e => updateRow(row.id!, 'salePrice', e.target.value)} className="w-full p-1 border rounded" />
                </td>
                <td className="p-2">
                  <input type="number" value={row.purchaseCost} onChange={e => updateRow(row.id!, 'purchaseCost', e.target.value)} className="w-full p-1 border rounded" />
                </td>
                <td className="p-2">
                  <input type="number" value={row.packagingCost} onChange={e => updateRow(row.id!, 'packagingCost', e.target.value)} className="w-full p-1 border rounded" />
                </td>
                <td className="p-2">
                  <input type="number" value={row.deliveryCost} onChange={e => updateRow(row.id!, 'deliveryCost', e.target.value)} className="w-full p-1 border rounded" />
                </td>
                <td className="p-2">
                  <select value={row.status} onChange={e => updateRow(row.id!, 'status', e.target.value)} className="w-full p-1 border rounded">
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2 text-center">
                  <button onClick={() => removeRow(row.id!)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-center">
          <button onClick={addRow} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={20} /> Add Another Order
          </button>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 right-0 w-full md:w-[calc(100%-16rem)] p-4 bg-white border-t shadow-lg flex justify-end gap-4 z-10">
        <div className="flex-1 flex items-center text-sm font-semibold text-gray-700 px-4">
          Total Items: {rows.length}
        </div>
        <button onClick={() => setRows([{ id: uuidv4(), status: OrderStatus.PENDING }])} className="px-6 py-2 border rounded-lg hover:bg-gray-50">
          Clear
        </button>
        <button onClick={handleSubmit} className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2">
          <FileDown size={20} /> Submit Batch
        </button>
      </div>
    </div>
  );
};

export default EntryForm;