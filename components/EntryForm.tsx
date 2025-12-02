
import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisRow, SavedProduct } from '../types';
import { appendAnalysisRows, getPageNames, savePageName, deletePageName, getSavedProducts, saveSavedProduct, deleteSavedProduct, getAnalysisByDate } from '../services/storage';
import { Plus, Trash2, Save, Settings, Info, Calendar, RefreshCw } from 'lucide-react';

// Sub-component for Managing Pages
const ManagePageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  items: string[];
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}> = ({ isOpen, onClose, items, onAdd, onDelete }) => {
  const [newItem, setNewItem] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Manage Pages</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><Plus className="rotate-45" size={24}/></button>
        </div>
        <div className="flex gap-2 mb-4">
          <input value={newItem} onChange={e => setNewItem(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="New Page Name..." />
          <button onClick={() => { onAdd(newItem); setNewItem(''); }} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"><Save size={18} /></button>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {items.map(item => (
            <div key={item} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{item}</span>
              <button onClick={() => onDelete(item)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-component for Managing Products (With Prices)
const ManageProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  products: SavedProduct[];
  onAdd: (product: SavedProduct) => void;
  onDelete: (id: string) => void;
}> = ({ isOpen, onClose, products, onAdd, onDelete }) => {
  const [name, setName] = useState('');
  const [buy, setBuy] = useState('');
  const [sale, setSale] = useState('');

  const handleSave = () => {
      if (!name) return;
      onAdd({
          id: uuidv4(),
          name,
          defaultBuyPrice: parseFloat(buy) || 0,
          defaultSalePrice: parseFloat(sale) || 0
      });
      setName('');
      setBuy('');
      setSale('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Manage Products & Fixed Prices</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><Plus className="rotate-45" size={24}/></button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-4 gap-2">
             <div className="col-span-4"><label className="text-xs font-bold text-gray-500">Product Name</label></div>
             <input value={name} onChange={e => setName(e.target.value)} className="col-span-4 border rounded p-2 text-sm" placeholder="e.g. Combo A" />
             
             <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Default Sale Price</label></div>
             <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Default Buy Price</label></div>
             
             <input type="number" value={sale} onChange={e => setSale(e.target.value)} className="col-span-2 border rounded p-2 text-sm" placeholder="0" />
             <input type="number" value={buy} onChange={e => setBuy(e.target.value)} className="col-span-2 border rounded p-2 text-sm" placeholder="0" />
             
             <button onClick={handleSave} className="col-span-4 mt-2 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Save Product</button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 border-t pt-2">
          {products.map(p => (
            <div key={p.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
              <div>
                  <div className="font-bold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500">Sale: {p.defaultSalePrice} | Buy: {p.defaultBuyPrice}</div>
              </div>
              <button onClick={() => onDelete(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
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
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  // Products List - Using string for numbers to support typing decimals
  const [products, setProducts] = useState<{id: string, name: string, qty: string, sale: string, buy: string}[]>([
    { id: uuidv4(), name: '', qty: '0', sale: '0', buy: '0' }
  ]);

  // Shared Costs (Representing TOTAL for the Day/Page)
  const [dollarAmount, setDollarAmount] = useState(0);
  const [rate, setRate] = useState(126); // Default 126
  const [pageSalary, setPageSalary] = useState(0);
  const [returnPercent, setReturnPercent] = useState(20);

  // Helper state to track what was loaded from storage
  const [loadedAdTotal, setLoadedAdTotal] = useState(0);
  const [loadedSalTotal, setLoadedSalTotal] = useState(0);

  // Global Costs
  const [globalMgmt, setGlobalMgmt] = useState(0);
  const [globalOffice, setGlobalOffice] = useState(0);
  const [globalBonus, setGlobalBonus] = useState(0);
  const [globalLoaded, setGlobalLoaded] = useState(false);

  // Unit Logistics
  const [deliveryCharge, setDeliveryCharge] = useState(90); // Default 90
  const [packingCost, setPackingCost] = useState(6); // Default 6
  const [codPercent, setCodPercent] = useState(1);

  // Sidebar Data
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // --- Effects ---
  useEffect(() => {
    setAvailablePages(getPageNames());
    setSavedProducts(getSavedProducts());
  }, [showPageModal, showProductModal]);

  useEffect(() => {
    // 1. Load Global Costs for the day
    const dayData = getAnalysisByDate(date);
    if (dayData) {
      setGlobalMgmt(dayData.totalMgmtSalary);
      setGlobalOffice(dayData.totalOfficeCost);
      setGlobalBonus(dayData.totalDailyBonus);
      setGlobalLoaded(true);
      setRecentEntries(dayData.rows);
    } else {
      setRecentEntries([]);
      setGlobalLoaded(false);
      setGlobalMgmt(0);
      setGlobalOffice(0);
      setGlobalBonus(0);
    }

    // 2. Load Page-Specific Costs (Total for Day)
    if (pageName && dayData) {
      const pageRows = dayData.rows.filter(r => r.pageName === pageName);
      if (pageRows.length > 0) {
        const totalAd = pageRows.reduce((sum, r) => sum + r.pageTotalAdDollar, 0);
        const totalSal = pageRows.reduce((sum, r) => sum + r.pageTotalSalary, 0);
        const pageRate = pageRows[0].dollarRate || dayData.dollarRate || 126;

        setDollarAmount(totalAd);
        setPageSalary(totalSal);
        setRate(pageRate);
        setLoadedAdTotal(totalAd);
        setLoadedSalTotal(totalSal);
      } else {
        setDollarAmount(0);
        setPageSalary(0);
        setRate(dayData.dollarRate || 126); 
        setLoadedAdTotal(0);
        setLoadedSalTotal(0);
      }
    } else {
      setDollarAmount(0);
      setPageSalary(0);
      setRate(dayData ? (dayData.dollarRate || 126) : 126);
      setLoadedAdTotal(0);
      setLoadedSalTotal(0);
    }

  }, [date, pageName]); 

  // --- Calculations ---
  const totalBatchOrders = useMemo(() => products.reduce((sum, p) => sum + Number(p.qty), 0), [products]);
  const totalPageAdCost = dollarAmount * rate;

  // --- Handlers ---
  const handleAddProduct = () => {
    setProducts([...products, { id: uuidv4(), name: '', qty: '0', sale: '0', buy: '0' }]);
  };

  const updateProduct = (id: string, field: string, val: string) => {
    // Logic for Product Name Selection & Auto-Fill
    if (field === 'name') {
        // Find if this name matches a saved product
        const saved = savedProducts.find(p => p.name.toLowerCase() === val.toLowerCase());
        
        setProducts(products.map(p => {
            if (p.id === id) {
                // If found, auto-fill prices, but allow override
                if (saved) {
                    return { ...p, name: val, sale: String(saved.defaultSalePrice), buy: String(saved.defaultBuyPrice) };
                }
                return { ...p, name: val };
            }
            return p;
        }));
    } else {
        // Standard numeric field update
        if (val === '' || /^\d*\.?\d*$/.test(val)) {
            setProducts(products.map(p => p.id === id ? { ...p, [field]: val } : p));
        }
    }
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) setProducts(products.filter(p => p.id !== id));
  };

  const handleSubmit = () => {
    if (!pageName) return alert("Please select a Page Name");
    if (totalBatchOrders === 0) return alert("Please enter at least one product with quantity");

    const currentDayData = getAnalysisByDate(date);
    let existingAdTotal = 0;
    let existingSalTotal = 0;
    
    if (currentDayData) {
       const pageRows = currentDayData.rows.filter(r => r.pageName === pageName);
       existingAdTotal = pageRows.reduce((sum, r) => sum + r.pageTotalAdDollar, 0);
       existingSalTotal = pageRows.reduce((sum, r) => sum + r.pageTotalSalary, 0);
    }

    const deltaAdDollar = dollarAmount - existingAdTotal;
    const deltaPageSalary = pageSalary - existingSalTotal;

    const existingTotalOrders = currentDayData ? currentDayData.rows.reduce((sum, r) => sum + r.totalOrders, 0) : 0;
    const estimatedDailyOrders = existingTotalOrders + totalBatchOrders;

    const avgMgmt = estimatedDailyOrders > 0 ? globalMgmt / estimatedDailyOrders : 0;
    const avgOffice = estimatedDailyOrders > 0 ? globalOffice / estimatedDailyOrders : 0;
    const avgBonus = estimatedDailyOrders > 0 ? globalBonus / estimatedDailyOrders : 0;

    const newRows: AnalysisRow[] = products.map(p => {
      const qty = Number(p.qty) || 0;
      const sale = Number(p.sale) || 0;
      const buy = Number(p.buy) || 0;

      const weight = qty / totalBatchOrders;
      const assignedAdDollar = deltaAdDollar * weight;
      const assignedSalary = deltaPageSalary * weight;

      const returnCount = Math.round((qty * returnPercent) / 100);
      const deliveredCount = qty - returnCount;
      
      const unitAd = qty > 0 ? (assignedAdDollar * rate) / qty : 0;
      const unitSal = qty > 0 ? assignedSalary / qty : 0;
      const unitOpsCost = unitAd + unitSal + avgMgmt + avgOffice + avgBonus + deliveryCharge + packingCost;
      
      const totalOpsCost = unitOpsCost * qty;
      const unitCod = (sale * codPercent) / 100;
      const totalCod = unitCod * deliveredCount;
      const totalPurchaseDelivered = buy * deliveredCount;
      const totalRevenue = sale * deliveredCount;
      const netProfit = totalRevenue - totalPurchaseDelivered - totalOpsCost - totalCod;

      return {
        id: uuidv4(),
        pageName: pageName,
        productName: p.name || 'General',
        totalOrders: qty,
        returnPercent: returnPercent,
        courierCancelPercent: 0,
        salePrice: sale,
        purchaseCost: buy,
        
        pageTotalAdDollar: assignedAdDollar, 
        dollarRate: rate,
        pageTotalSalary: assignedSalary,
        
        deliveryCharge,
        packagingCost: packingCost,
        haziraBonus: 0,
        codChargePercent: codPercent,
        
        calculatedNetProfit: netProfit,
        calculatedReturnLoss: unitOpsCost * returnCount,
        calculatedTotalSales: totalRevenue
      };
    });

    appendAnalysisRows(date, newRows, {
      dollarRate: rate,
      totalMgmtSalary: globalMgmt,
      totalOfficeCost: globalOffice,
      totalDailyBonus: globalBonus
    });

    alert("Batch Added Successfully!");
    
    // Check if we need to auto-save any new product names to the list (simple strings)?
    // User requested specifically managing Fixed Prices via manager. 
    // We will just clear the form.
    setProducts([{ id: uuidv4(), name: '', qty: '0', sale: '0', buy: '0' }]);
    setLoadedAdTotal(dollarAmount);
    setLoadedSalTotal(pageSalary);
    
    const updated = getAnalysisByDate(date);
    if (updated) setRecentEntries(updated.rows);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
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
              {pageName && (
                  <div className="mt-2 text-xs bg-blue-50 text-blue-700 p-2 rounded border border-blue-100 flex justify-between">
                    <span>Current Day Total:</span>
                    <span className="font-bold">Ad: ${Math.round(loadedAdTotal)} | Sal: ৳{Math.round(loadedSalTotal)}</span>
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-blue-800 text-sm font-bold uppercase flex items-center gap-2">
              Product List 
              <button onClick={() => setShowProductModal(true)} className="px-2 py-0.5 bg-white rounded border text-xs text-blue-600 hover:bg-blue-50">Manage Products & Prices</button>
            </h3>
            <span className="text-2xl font-bold text-blue-900">{totalBatchOrders} <span className="text-sm font-normal text-blue-600">Total Batch Orders</span></span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-blue-700 uppercase px-2">
              <div className="col-span-4">Product Name (Select to Auto-fill)</div>
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
                    placeholder="Type or Select..." 
                    value={p.name}
                    onChange={e => updateProduct(p.id, 'name', e.target.value)}
                  />
                  <datalist id="product-suggestions">
                    {savedProducts.map(prod => <option key={prod.id} value={prod.name} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <input type="text" inputMode="decimal" className="w-full border rounded p-2" placeholder="Qty" value={p.qty} onChange={e => updateProduct(p.id, 'qty', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <input type="text" inputMode="decimal" className="w-full border rounded p-2" placeholder="Sale" value={p.sale} onChange={e => updateProduct(p.id, 'sale', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <input type="text" inputMode="decimal" className="w-full border rounded p-2" placeholder="Buy" value={p.buy} onChange={e => updateProduct(p.id, 'buy', e.target.value)} />
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
           <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-gray-500 text-sm font-bold uppercase">Page Shared Costs (Total Daily)</h3>
                <p className="text-xs text-blue-500">
                  {pageName ? `Viewing Daily Total for: ${pageName}` : 'Select a page to load totals'}
                </p>
              </div>
              {pageName && (
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw size={12}/> Auto-loads existing values
                </div>
              )}
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Total Dollar Amount ($)</label>
                <input 
                  type="number" 
                  value={dollarAmount} 
                  onChange={e => setDollarAmount(Number(e.target.value))} 
                  className="w-full border rounded p-2 mt-1 focus:ring-2 focus:ring-blue-100 outline-none" 
                  placeholder="0"
                />
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
                <label className="text-xs font-semibold text-gray-600">Total Page Salary (Daily)</label>
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
             <h3 className="text-yellow-800 text-sm font-bold uppercase">Office Global Costs (Daily - Applies to All Pages)</h3>
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
      <ManagePageModal 
        isOpen={showPageModal} 
        onClose={() => setShowPageModal(false)} 
        items={availablePages}
        onAdd={savePageName}
        onDelete={deletePageName}
      />
      <ManageProductModal 
        isOpen={showProductModal} 
        onClose={() => setShowProductModal(false)} 
        products={savedProducts}
        onAdd={saveSavedProduct}
        onDelete={deleteSavedProduct}
      />
    </div>
  );
};

export default EntryForm;
