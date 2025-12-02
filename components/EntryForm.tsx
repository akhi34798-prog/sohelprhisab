import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisRow } from '../types';
import { appendAnalysisRows, getPageNames, savePageName, deletePageName, getProductNames, saveProductName, deleteProductName, getAnalysisByDate } from '../services/storage';
import { Plus, Trash2, Save, Settings, Info, Calendar } from 'lucide-react';

// Sub-component for Managing Lists
const ManageModal: React.FC<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  items: string[];
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}> = ({ title, isOpen, onClose, items, onAdd, onDelete }) => {
  const [newItem, setNewItem] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><Plus className="rotate-45" size={24}/></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input 
            value={newItem} 
            onChange={e => setNewItem(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Add new..."
          />
          <button 
            onClick={() => { onAdd(newItem); setNewItem(''); }}
            className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
          >
            <Save size={18} />
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {items.map(item => (
            <div key={item} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{item}</span>
              <button onClick={() => onDelete(item)} className="text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const EntryForm: React.FC = () => {
  // --- State ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageName, setPageName] = useState('');
  
  // Modals
  const [showPageModal, setShowPageModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);

  // Products List
  const [products, setProducts] = useState<{id: string, name: string, qty: number, sale: number, buy: number}[]>([
    { id: uuidv4(), name: '', qty: 0, sale: 0, buy: 0 }
  ]);

  // Shared Costs
  const [dollarAmount, setDollarAmount] = useState(0);
  const [rate, setRate] = useState(120);
  const [pageSalary, setPageSalary] = useState(0);
  const [returnPercent, setReturnPercent] = useState(20);

  // Global Costs
  const [globalMgmt, setGlobalMgmt] = useState(0);
  const [globalOffice, setGlobalOffice] = useState(0);
  const [globalBonus, setGlobalBonus] = useState(0);
  const [globalLoaded, setGlobalLoaded] = useState(false);

  // Unit Logistics
  const [deliveryCharge, setDeliveryCharge] = useState(120);
  const [packingCost, setPackingCost] = useState(15);
  const [codPercent, setCodPercent] = useState(1);

  // Sidebar Data
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // --- Effects ---
  useEffect(() => {
    setAvailablePages(getPageNames());
    setAvailableProducts(getProductNames());
  }, [showPageModal, showProductModal]);

  useEffect(() => {
    // Load existing globals for the day if avail
    const dayData = getAnalysisByDate(date);
    if (dayData) {
      setGlobalMgmt(dayData.totalMgmtSalary);
      setGlobalOffice(dayData.totalOfficeCost);
      setGlobalBonus(dayData.totalDailyBonus);
      setGlobalLoaded(true);
      
      // Load recent entries
      setRecentEntries(dayData.rows);
    } else {
      setRecentEntries([]);
      setGlobalLoaded(false);
    }
  }, [date]);

  // --- Calculations ---
  const totalBatchOrders = useMemo(() => products.reduce((sum, p) => sum + p.qty, 0), [products]);
  const totalPageAdCost = dollarAmount * rate;

  const calculatedCosts = useMemo(() => {
    return {
      adPerUnit: totalBatchOrders > 0 ? totalPageAdCost / totalBatchOrders : 0,
      salaryPerUnit: totalBatchOrders > 0 ? pageSalary / totalBatchOrders : 0,
    };
  }, [totalBatchOrders, totalPageAdCost, pageSalary]);

  // --- Handlers ---
  const handleAddProduct = () => {
    setProducts([...products, { id: uuidv4(), name: '', qty: 0, sale: 0, buy: 0 }]);
  };

  const updateProduct = (id: string, field: string, val: any) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) setProducts(products.filter(p => p.id !== id));
  };

  const handleSubmit = () => {
    if (!pageName) return alert("Please select a Page Name");
    if (totalBatchOrders === 0) return alert("Please enter at least one product with quantity");

    // Estimate total orders for the day to calculate reasonable averages for global costs
    // (Existing orders + new batch orders)
    const existingTotalOrders = recentEntries.reduce((sum, r) => sum + r.totalOrders, 0);
    const estimatedDailyOrders = existingTotalOrders + totalBatchOrders;

    const avgMgmt = estimatedDailyOrders > 0 ? globalMgmt / estimatedDailyOrders : 0;
    const avgOffice = estimatedDailyOrders > 0 ? globalOffice / estimatedDailyOrders : 0;
    const avgBonus = estimatedDailyOrders > 0 ? globalBonus / estimatedDailyOrders : 0;

    // Distribute costs and create rows
    const newRows: AnalysisRow[] = products.map(p => {
      // Weight based on quantity
      const weight = p.qty / totalBatchOrders;
      
      // -- PRE-CALCULATION FOR IMMEDIATE DASHBOARD UPDATE --
      const returnCount = Math.round((p.qty * returnPercent) / 100);
      const deliveredCount = p.qty - returnCount;
      
      // Costs per Unit
      const unitAd = (dollarAmount * weight * rate) / p.qty;
      const unitSal = (pageSalary * weight) / p.qty;
      // Note: We don't include COD here in general ops cost, because COD is only on delivered
      const unitOpsCost = unitAd + unitSal + avgMgmt + avgOffice + avgBonus + deliveryCharge + packingCost;
      
      // Total Ops (On ALL items)
      const totalOpsCost = unitOpsCost * p.qty;
      
      // COD Charge (On DELIVERED items only)
      const unitCod = (p.sale * codPercent) / 100;
      const totalCod = unitCod * deliveredCount;

      // Purchase Cost (On DELIVERED items only, as returned items act as inventory asset recovered)
      const totalPurchaseDelivered = p.buy * deliveredCount;
      
      // Revenue
      const totalRevenue = p.sale * deliveredCount;
      
      // Net Profit
      const netProfit = totalRevenue - totalPurchaseDelivered - totalOpsCost - totalCod;

      return {
        id: uuidv4(),
        pageName: pageName,
        productName: p.name || 'General',
        totalOrders: p.qty,
        returnPercent: returnPercent,
        courierCancelPercent: 0,
        salePrice: p.sale,
        purchaseCost: p.buy,
        
        // Distributed costs
        pageTotalAdDollar: dollarAmount * weight,
        dollarRate: rate,
        pageTotalSalary: pageSalary * weight,
        
        deliveryCharge,
        packagingCost: packingCost,
        haziraBonus: 0,
        codChargePercent: codPercent,
        
        // Save Calculated Fields
        calculatedNetProfit: netProfit,
        calculatedReturnLoss: unitOpsCost * returnCount,
        calculatedTotalSales: totalRevenue
      };
    });

    appendAnalysisRows(date, newRows, {
      dollarRate: rate, // Update global rate preference
      totalMgmtSalary: globalMgmt,
      totalOfficeCost: globalOffice,
      totalDailyBonus: globalBonus
    });

    alert("Batch Added Successfully!");
    
    // Reset Batch Fields
    setProducts([{ id: uuidv4(), name: '', qty: 0, sale: 0, buy: 0 }]);
    setDollarAmount(0);
    setPageSalary(0);
    // Keep globals, date, page, and logistics as they might be similar
    
    // Refresh Sidebar
    const updated = getAnalysisByDate(date);
    if (updated) setRecentEntries(updated.rows);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Main Entry Form */}
      <div className="flex-1 p-8 space-y-6">
        {/* Page Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-bold uppercase mb-4">Page Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Page Name</label>
                <button onClick={() => setShowPageModal(true)} className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                  <Settings size={12} /> Manage Pages
                </button>
              </div>
              <select value={pageName} onChange={e => setPageName(e.target.value)} className="w-full border rounded p-2 bg-white">
                <option value="">Select Page...</option>
                {availablePages.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-blue-800 text-sm font-bold uppercase flex items-center gap-2">
              Product List 
              <button onClick={() => setShowProductModal(true)} className="px-2 py-0.5 bg-white rounded border text-xs text-blue-600 hover:bg-blue-50">Manage Products</button>
            </h3>
            <span className="text-2xl font-bold text-blue-900">{totalBatchOrders} <span className="text-sm font-normal text-blue-600">Total Batch Orders</span></span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-blue-700 uppercase px-2">
              <div className="col-span-4">Product Name</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Sale Price (৳)</div>
              <div className="col-span-2">Buy Price (৳)</div>
              <div className="col-span-2"></div>
            </div>
            {products.map((p, idx) => (
              <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <input 
                    list="product-suggestions"
                    className="w-full border rounded p-2" 
                    placeholder="Product Name..." 
                    value={p.name}
                    onChange={e => updateProduct(p.id, 'name', e.target.value)}
                  />
                  <datalist id="product-suggestions">
                    {availableProducts.map(prod => <option key={prod} value={prod} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <input type="number" className="w-full border rounded p-2" placeholder="Qty" value={p.qty || ''} onChange={e => updateProduct(p.id, 'qty', Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <input type="number" className="w-full border rounded p-2" placeholder="Sale" value={p.sale || ''} onChange={e => updateProduct(p.id, 'sale', Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <input type="number" className="w-full border rounded p-2" placeholder="Buy" value={p.buy || ''} onChange={e => updateProduct(p.id, 'buy', Number(e.target.value))} />
                </div>
                <div className="col-span-2 text-center">
                   {products.length > 1 && (
                     <button onClick={() => removeProduct(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                   )}
                </div>
              </div>
            ))}
            <button onClick={handleAddProduct} className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline mt-2">
              <Plus size={16} /> Add Another Product
            </button>
          </div>
        </div>

        {/* Shared Costs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-gray-500 text-sm font-bold uppercase mb-4">Page Shared Costs (Total)</h3>
           <p className="text-xs text-gray-400 mb-4 -mt-3">Costs divided by Batch Total ({totalBatchOrders})</p>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Dollar Amount ($)</label>
                <input type="number" value={dollarAmount} onChange={e => setDollarAmount(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Rate (Tk)</label>
                <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-600">Total Page Ad Cost</label>
                <div className="w-full bg-blue-50 border border-blue-100 rounded p-2 mt-1 font-bold text-blue-800">
                  {Math.round(totalPageAdCost)}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Total Page Salary</label>
                <input type="number" value={pageSalary} onChange={e => setPageSalary(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
           </div>
           
           <div className="mt-4 w-48">
              <label className="text-xs font-semibold text-gray-600">Return Expected %</label>
              <input type="number" value={returnPercent} onChange={e => setReturnPercent(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
           </div>
        </div>

        {/* Global Costs */}
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-yellow-800 text-sm font-bold uppercase">Office Global Costs (Daily)</h3>
             {globalLoaded && <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded flex items-center gap-1"><Info size={12}/> Auto-loaded from date</span>}
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-yellow-900">Total Mgmt Salary</label>
                <input type="number" value={globalMgmt} onChange={e => setGlobalMgmt(Number(e.target.value))} className="w-full border border-yellow-300 rounded p-2 mt-1 bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-yellow-900">Total Office Cost</label>
                <input type="number" value={globalOffice} onChange={e => setGlobalOffice(Number(e.target.value))} className="w-full border border-yellow-300 rounded p-2 mt-1 bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-yellow-900">Total Bonus</label>
                <input type="number" value={globalBonus} onChange={e => setGlobalBonus(Number(e.target.value))} className="w-full border border-yellow-300 rounded p-2 mt-1 bg-white" />
              </div>
           </div>
        </div>

        {/* Unit Logistics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-gray-500 text-sm font-bold uppercase mb-4">Unit Logistics</h3>
           <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-gray-600">Delivery Charge</label>
                <input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Packing Cost</label>
                <input type="number" value={packingCost} onChange={e => setPackingCost(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">COD Percentage %</label>
                <input type="number" value={codPercent} onChange={e => setCodPercent(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
              </div>
           </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button 
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transform transition hover:scale-105"
          >
            <Plus size={20} /> Add Batch To Sheet
          </button>
        </div>
      </div>

      {/* Sidebar Right - Recent Entries */}
      <div className="w-full lg:w-80 bg-white border-l p-6 hidden lg:block overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-700 flex items-center gap-2"><Calendar size={16}/> Recent Entries</h3>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{date}</span>
        </div>
        
        {recentEntries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No entries added for this date yet.</p>
        ) : (
          <div className="space-y-4">
            {recentEntries.slice().reverse().map((entry, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-gray-800">{entry.pageName}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">{entry.totalOrders} Orders</span>
                </div>
                <div className="text-gray-500 text-xs mb-2">{entry.productName}</div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                   <div>
                     <span className="text-gray-400">Ad($):</span> {Math.round(entry.pageTotalAdDollar)}
                   </div>
                   <div>
                     <span className="text-gray-400">Sal:</span> {Math.round(entry.pageTotalSalary)}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ManageModal 
        title="Manage Page Names" 
        isOpen={showPageModal} 
        onClose={() => setShowPageModal(false)} 
        items={availablePages}
        onAdd={savePageName}
        onDelete={deletePageName}
      />
      <ManageModal 
        title="Manage Product Names" 
        isOpen={showProductModal} 
        onClose={() => setShowProductModal(false)} 
        items={availableProducts}
        onAdd={saveProductName}
        onDelete={deleteProductName}
      />
    </div>
  );
};

export default EntryForm;