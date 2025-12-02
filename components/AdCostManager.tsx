import React, { useState, useEffect, useMemo } from 'react';
import { getAnalysisByDate, saveAnalysisData, getPageNames, recalculateDailyFinancials } from '../services/storage';
import { DailyAnalysisData, AnalysisRow } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Edit3, Save, Info, Settings, Briefcase, X } from 'lucide-react';

const AdCostManager: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayData, setDayData] = useState<DailyAnalysisData | null>(null);
  
  // Global State (Strings for better input handling)
  const [globalRate, setGlobalRate] = useState<string>('120');
  const [globalMgmt, setGlobalMgmt] = useState<string>('');
  const [globalOffice, setGlobalOffice] = useState<string>('');
  const [globalBonus, setGlobalBonus] = useState<string>('');

  // Selection & Page Edit State (Strings)
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [editDollar, setEditDollar] = useState<string>('');
  const [editRate, setEditRate] = useState<string>('');
  const [editSalary, setEditSalary] = useState<string>('');

  // All System Pages
  const [allSystemPages, setAllSystemPages] = useState<string[]>([]);

  useEffect(() => {
    // Load all known page names from storage so dropdown isn't empty on new days
    setAllSystemPages(getPageNames());
    loadData();
  }, [date]);

  const loadData = () => {
    const data = getAnalysisByDate(date);
    setDayData(data);
    
    if (data) {
        setGlobalRate(String(data.dollarRate || 120));
        setGlobalMgmt(data.totalMgmtSalary ? String(data.totalMgmtSalary) : '');
        setGlobalOffice(data.totalOfficeCost ? String(data.totalOfficeCost) : '');
        setGlobalBonus(data.totalDailyBonus ? String(data.totalDailyBonus) : '');
    } else {
        setGlobalRate('120');
        setGlobalMgmt('');
        setGlobalOffice('');
        setGlobalBonus('');
    }

    resetEditForm();
  };

  const resetEditForm = () => {
    setSelectedPage('');
    setEditDollar('');
    setEditRate('');
    setEditSalary('');
  };

  // Merge pages present in the daily data with all system pages to ensure everything is selectable
  const availablePages = useMemo(() => {
    const dataPages = dayData ? dayData.rows.map(r => r.pageName) : [];
    const combined = new Set([...allSystemPages, ...dataPages]);
    return Array.from(combined).sort();
  }, [dayData, allSystemPages]);

  // Regex to allow only numbers and one decimal point
  const validateNumberInput = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      return true;
    }
    return false;
  };

  const handleUpdateGlobals = () => {
      const newRate = parseFloat(globalRate) || 120;
      const newMgmt = parseFloat(globalMgmt) || 0;
      const newOffice = parseFloat(globalOffice) || 0;
      const newBonus = parseFloat(globalBonus) || 0;

      // Use existing data or create new
      let newData: DailyAnalysisData = dayData ? { ...dayData } : {
          id: uuidv4(),
          date: date,
          dollarRate: 120,
          totalMgmtSalary: 0,
          totalOfficeCost: 0,
          totalDailyBonus: 0,
          rows: []
      };

      newData.dollarRate = newRate;
      newData.totalMgmtSalary = newMgmt;
      newData.totalOfficeCost = newOffice;
      newData.totalDailyBonus = newBonus;

      // Recalculate ALL rows with new globals using the central engine
      const calculated = recalculateDailyFinancials(newData);

      saveAnalysisData(calculated);
      setDayData(calculated);
      alert("Global daily costs updated & calculated successfully!");
  };

  const handlePageSelect = (page: string) => {
    if (!page) {
        resetEditForm();
        return;
    }
    setSelectedPage(page);
    
    // If no data exists yet for the day, we just let the user enter from scratch
    if (!dayData) {
        setEditDollar('');
        setEditRate(globalRate); // Use global rate as default
        setEditSalary('');
        return;
    }

    // Calculate current totals for this page
    const pageRows = dayData.rows.filter(r => r.pageName === page);
    
    if (pageRows.length === 0) {
        // Page selected but no rows yet (0 orders)
        setEditDollar('');
        setEditRate(globalRate);
        setEditSalary('');
    } else {
        const totalDollar = pageRows.reduce((sum, r) => sum + r.pageTotalAdDollar, 0);
        const totalSalary = pageRows.reduce((sum, r) => sum + r.pageTotalSalary, 0);
        // Use rate from first row or global fallback
        const currentRate = pageRows[0].dollarRate ? pageRows[0].dollarRate : dayData.dollarRate;

        setEditDollar(String(totalDollar));
        setEditRate(String(currentRate));
        setEditSalary(String(totalSalary));
    }
  };

  const handleSavePageCost = () => {
    if (!selectedPage) return;

    const dDollar = parseFloat(editDollar) || 0;
    const dRate = parseFloat(editRate) || 0;
    const dSalary = parseFloat(editSalary) || 0;

    // Initialize dayData if it doesn't exist
    let currentDayData: DailyAnalysisData = dayData ? { ...dayData } : {
        id: uuidv4(),
        date: date,
        dollarRate: parseFloat(globalRate) || 120,
        totalMgmtSalary: 0,
        totalOfficeCost: 0,
        totalDailyBonus: 0,
        rows: []
    };

    const pageRows = currentDayData.rows.filter(r => r.pageName === selectedPage);
    const totalOrders = pageRows.reduce((sum, r) => sum + r.totalOrders, 0);

    let updatedRows = [...currentDayData.rows];
    
    if (pageRows.length === 0) {
        // CASE 1: No orders exist for this page. Create a dummy "Cost Only" row.
        const newRow: AnalysisRow = {
            id: uuidv4(),
            pageName: selectedPage,
            productName: 'Ad Cost Entry', // Placeholder
            totalOrders: 0, 
            returnPercent: 0,
            courierCancelPercent: 0,
            salePrice: 0,
            purchaseCost: 0,
            pageTotalAdDollar: dDollar,
            dollarRate: dRate,
            pageTotalSalary: dSalary,
            deliveryCharge: 0,
            packagingCost: 0,
            haziraBonus: 0,
            codChargePercent: 0,
            calculatedNetProfit: 0, // Will be recalc'd
            calculatedReturnLoss: 0,
            calculatedTotalSales: 0
        };
        updatedRows.push(newRow);
    } else {
        // CASE 2: Orders exist. Distribute costs proportionally across the page's batches
        // WARNING DIALOG
        const confirmUpdate = window.confirm(
            `⚠️ WARNING: You are about to update costs for ${selectedPage}.\n\n` +
            `Total Orders: ${totalOrders}\n` + 
            `New Ad Cost: $${dDollar} (@ ${dRate})\n` + 
            `New Salary: ৳${dSalary}\n\n` +
            `This will recalculate profit for these orders. Proceed?`
        );
        if (!confirmUpdate) return;

        updatedRows = currentDayData.rows.map(r => {
            if (r.pageName === selectedPage) {
                const weight = totalOrders > 0 ? (r.totalOrders / totalOrders) : 0;
                return {
                    ...r,
                    pageTotalAdDollar: dDollar * weight,
                    dollarRate: dRate,
                    pageTotalSalary: dSalary * weight
                };
            }
            return r;
        });
    }

    // Use Central Engine to recalculate everything
    const updatedData = { ...currentDayData, rows: updatedRows };
    const calculated = recalculateDailyFinancials(updatedData);

    saveAnalysisData(calculated);
    setDayData(calculated);
    
    alert("Cost updated & profits recalculated successfully!");
    resetEditForm();
  };

  const totalAdCostTk = Math.round((parseFloat(editDollar) || 0) * (parseFloat(editRate) || 0));

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-bold text-gray-800">Ad & Daily Cost Manager</h2>
           <p className="text-gray-500">System Ad Entry & Salary Management</p>
        </div>
        <div className="flex items-center gap-4">
             <button onClick={() => window.print()} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 no-print flex items-center gap-2">
                <Settings size={16}/> Print / PDF
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Forms */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Edit Cost Entry Card (Yellow Theme) */}
          <div className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${selectedPage ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'}`}>
             <div className="p-4 border-b flex justify-between items-center bg-white">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 p-1.5 rounded"><Edit3 size={16}/></span> 
                    {selectedPage ? 'Edit Cost Entry' : 'Add / Update Cost'}
                 </h3>
                 {selectedPage && (
                     <button onClick={resetEditForm} className="text-red-400 hover:text-red-600 flex items-center gap-1 text-xs">
                         <X size={14}/> Cancel
                     </button>
                 )}
             </div>
             
             <div className="p-5 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Briefcase size={12}/> Date</label>
                 <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="w-full border rounded p-2.5 bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Page Name</label>
                 <select 
                   value={selectedPage} 
                   onChange={e => handlePageSelect(e.target.value)} 
                   className="w-full border rounded p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 >
                   <option value="">{availablePages.length === 0 ? "No pages found" : "Select Page..."}</option>
                   {availablePages.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Dollar ($)</label>
                   <input 
                    type="text" 
                    inputMode="decimal"
                    value={editDollar} 
                    onChange={e => validateNumberInput(e.target.value) && setEditDollar(e.target.value)} 
                    className="w-full border rounded p-2.5 text-sm" 
                    placeholder="0"
                    disabled={!selectedPage} 
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">Rate (Tk)</label>
                   <input 
                    type="text" 
                    inputMode="decimal"
                    value={editRate} 
                    onChange={e => validateNumberInput(e.target.value) && setEditRate(e.target.value)} 
                    className="w-full border rounded p-2.5 text-sm" 
                    placeholder="0"
                    disabled={!selectedPage} 
                   />
                 </div>
               </div>

               <div>
                   <label className="block text-xs font-bold text-green-700 mb-1">Total Ad Cost (Tk)</label>
                   <div className="w-full bg-green-50 border border-green-200 rounded p-2.5 text-sm font-bold text-green-800 flex items-center">
                     <span className="mr-1">৳</span> {totalAdCostTk.toLocaleString()}
                   </div>
                   <p className="text-[10px] text-gray-400 mt-1">Auto-calculated if Dollar & Rate are set.</p>
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">Total Page Salary</label>
                 <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs">৳</span>
                    <input 
                        type="text" 
                        inputMode="decimal"
                        value={editSalary} 
                        onChange={e => validateNumberInput(e.target.value) && setEditSalary(e.target.value)} 
                        className="w-full border rounded p-2.5 pl-6 text-sm" 
                        placeholder="0"
                        disabled={!selectedPage} 
                    />
                 </div>
               </div>

               <button 
                 onClick={handleSavePageCost}
                 disabled={!selectedPage}
                 className={`w-full py-3 rounded font-bold shadow-sm flex justify-center items-center gap-2 transition-all text-sm
                    ${selectedPage 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md' 
                        : 'bg-green-600 text-white opacity-90 cursor-not-allowed grayscale'}`}
               >
                 {selectedPage ? <Save size={16} /> : <Save size={16} />}
                 {selectedPage ? 'Update Entry' : 'Save Cost'}
               </button>
             </div>
          </div>

          {/* Global Settings (Secondary) */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
             <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-4">
               <Settings size={14}/> Daily Global Costs
             </h3>
             <div className="space-y-3">
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Mgmt Salary</label>
                        <input type="text" inputMode="decimal" value={globalMgmt} onChange={e => validateNumberInput(e.target.value) && setGlobalMgmt(e.target.value)} className="w-full border rounded p-2 text-xs" placeholder="0"/>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Office Cost</label>
                        <input type="text" inputMode="decimal" value={globalOffice} onChange={e => validateNumberInput(e.target.value) && setGlobalOffice(e.target.value)} className="w-full border rounded p-2 text-xs" placeholder="0"/>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Daily Bonus</label>
                        <input type="text" inputMode="decimal" value={globalBonus} onChange={e => validateNumberInput(e.target.value) && setGlobalBonus(e.target.value)} className="w-full border rounded p-2 text-xs" placeholder="0"/>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400">Global Rate</label>
                        <input type="text" inputMode="decimal" value={globalRate} onChange={e => validateNumberInput(e.target.value) && setGlobalRate(e.target.value)} className="w-full border rounded p-2 text-xs" placeholder="120"/>
                    </div>
                 </div>
                 <button onClick={handleUpdateGlobals} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 rounded">
                    Update Globals & Recalculate
                 </button>
             </div>
          </div>

        </div>

        {/* Right Column: Table Summary */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
             {/* Empty State or Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b">
                   <tr>
                     <th className="p-4">Date</th>
                     <th className="p-4">Page</th>
                     <th className="p-4 text-center">Dollar ($)</th>
                     <th className="p-4 text-center">Rate (Tk)</th>
                     <th className="p-4 text-center text-green-600">Total Ad Cost</th>
                     <th className="p-4 text-center">Salary</th>
                     <th className="p-4 text-center">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {availablePages.length === 0 ? (
                     <tr><td colSpan={7} className="p-10 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                            <Info size={32} className="opacity-20"/>
                            <span>No pages found in system. Add a page in "Order Entry" first.</span>
                        </div>
                     </td></tr>
                   ) : availablePages.map(page => {
                     const rows = dayData?.rows.filter(r => r.pageName === page) || [];
                     const tDollar = rows.length > 0 ? rows.reduce((s,r) => s + r.pageTotalAdDollar, 0) : 0;
                     const tRate = rows.length > 0 && rows[0].dollarRate ? rows[0].dollarRate : (dayData?.dollarRate || 0);
                     const tSalary = rows.length > 0 ? rows.reduce((s,r) => s + r.pageTotalSalary, 0) : 0;
                     const hasData = rows.length > 0;
                     const isActive = selectedPage === page;

                     return (
                       <tr key={page} className={`transition-colors ${isActive ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                         <td className="p-4 text-gray-500 font-mono text-xs">{date}</td>
                         <td className="p-4 font-bold text-blue-700 bg-blue-50/50 w-32">
                            <span className={`px-2 py-1 rounded text-xs ${hasData ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>{page}</span>
                         </td>
                         <td className="p-4 text-center text-gray-600">${Math.round(tDollar)}</td>
                         <td className="p-4 text-center text-gray-600">{tRate}</td>
                         <td className="p-4 text-center font-bold text-green-700">{Math.round(tDollar * tRate).toLocaleString()}</td>
                         <td className="p-4 text-center text-gray-600">{Math.round(tSalary).toLocaleString()}</td>
                         <td className="p-4 text-center">
                           <button 
                            onClick={() => handlePageSelect(page)} 
                            className={`text-xs font-bold px-3 py-1.5 rounded transition-all
                                ${isActive 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'text-blue-600 hover:text-blue-800 hover:underline'}`}
                           >
                             {isActive ? 'Editing...' : (hasData ? 'Edit' : 'Add Cost')}
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCostManager;