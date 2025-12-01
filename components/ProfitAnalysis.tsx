import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Save, Plus, Trash2, Calculator } from 'lucide-react';
import { saveAnalysisData, getAnalysisByDate } from '../services/storage';
import { AnalysisRow, DailyAnalysisData } from '../types';

const ProfitAnalysis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Global Daily Inputs
  const [dollarRate, setDollarRate] = useState(120);
  const [totalMgmtSalary, setTotalMgmtSalary] = useState(0);
  const [totalOfficeCost, setTotalOfficeCost] = useState(0);
  const [totalDailyBonus, setTotalDailyBonus] = useState(0);

  // Rows
  const [rows, setRows] = useState<AnalysisRow[]>([
    {
      id: uuidv4(), pageName: 'Page 1', productName: 'Prod A', totalOrders: 0, returnPercent: 20, 
      courierCancelPercent: 0, salePrice: 0, purchaseCost: 0, pageTotalAdDollar: 0, 
      pageTotalSalary: 0, deliveryCharge: 120, packagingCost: 15, haziraBonus: 0, codChargePercent: 1
    }
  ]);

  // Load data when date changes
  useEffect(() => {
    const data = getAnalysisByDate(date);
    if (data) {
      setDollarRate(data.dollarRate);
      setTotalMgmtSalary(data.totalMgmtSalary);
      setTotalOfficeCost(data.totalOfficeCost);
      setTotalDailyBonus(data.totalDailyBonus);
      setRows(data.rows);
    } else {
      // Reset defaults if no data
      setRows([{
        id: uuidv4(), pageName: 'New Page', productName: '', totalOrders: 0, returnPercent: 20, 
        courierCancelPercent: 0, salePrice: 0, purchaseCost: 0, pageTotalAdDollar: 0, 
        pageTotalSalary: 0, deliveryCharge: 120, packagingCost: 15, haziraBonus: 0, codChargePercent: 1
      }]);
    }
  }, [date]);

  const addRow = () => {
    setRows([...rows, {
      id: uuidv4(), pageName: '', productName: '', totalOrders: 0, returnPercent: 20, 
      courierCancelPercent: 0, salePrice: 0, purchaseCost: 0, pageTotalAdDollar: 0, 
      pageTotalSalary: 0, deliveryCharge: 120, packagingCost: 15, haziraBonus: 0, codChargePercent: 1
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof AnalysisRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: Number(value) || (field === 'pageName' || field === 'productName' ? value : 0) } : r));
  };

  // --- CALCULATIONS ---

  // Total Office Orders (Sum of all page orders)
  const totalOfficeOrders = useMemo(() => rows.reduce((sum, r) => sum + r.totalOrders, 0), [rows]);

  // Derived Globals (Per Order)
  const avgMgmtSalary = totalOfficeOrders > 0 ? totalMgmtSalary / totalOfficeOrders : 0;
  const avgOfficeCost = totalOfficeOrders > 0 ? totalOfficeCost / totalOfficeOrders : 0;
  const avgBonus = totalOfficeOrders > 0 ? totalDailyBonus / totalOfficeOrders : 0;

  // Process Rows with Calculations
  const calculatedRows = useMemo(() => {
    return rows.map(r => {
      // Basic counts
      const returnCount = Math.round((r.totalOrders * r.returnPercent) / 100);
      const deliveredCount = r.totalOrders - returnCount;
      
      // Per Unit Calculations
      const unitAdCost = r.totalOrders > 0 ? (r.pageTotalAdDollar * dollarRate) / r.totalOrders : 0;
      const unitPageSalary = r.totalOrders > 0 ? r.pageTotalSalary / r.totalOrders : 0;
      const unitCod = (r.salePrice * r.codChargePercent) / 100;
      
      // Total Operational Cost Per Unit (Excluding Maler Dam)
      const unitOpCostNoReturn = unitAdCost + unitPageSalary + avgMgmtSalary + avgBonus + avgOfficeCost + unitCod + r.deliveryCharge + r.packagingCost;
      const unitTotalCostExclReturn = r.purchaseCost + unitOpCostNoReturn;

      // Return Logic
      const totalReturnLossTaka = unitOpCostNoReturn * returnCount;
      const unitReturnCharge = deliveredCount > 0 ? totalReturnLossTaka / deliveredCount : 0;

      // Final Total Cost Per Unit (for a delivered item)
      const finalUnitTotalCost = unitTotalCostExclReturn + unitReturnCharge;

      // Profit
      const perPichProfit = r.salePrice - finalUnitTotalCost;
      
      // Net Profit
      const totalNetProfit = perPichProfit * deliveredCount;
      
      // Asol Net Profit (Subtracting Manual Adjustments)
      const asolNetProfit = totalNetProfit - r.haziraBonus; 

      return {
        ...r,
        returnCount,
        deliveredCount,
        unitAdCost,
        unitPageSalary,
        avgMgmtSalary,
        avgBonus,
        avgOfficeCost,
        unitCod,
        unitReturnCharge,
        totalReturnLossTaka,
        finalUnitTotalCost,
        perPichProfit,
        totalNetProfit,
        asolNetProfit,
        totalSales: r.salePrice * deliveredCount
      };
    });
  }, [rows, dollarRate, avgMgmtSalary, avgOfficeCost, avgBonus]);

  // Grand Totals
  const grandTotal = useMemo(() => {
    return calculatedRows.reduce((acc, r) => ({
      orders: acc.orders + r.totalOrders,
      delivered: acc.delivered + r.deliveredCount,
      returnLoss: acc.returnLoss + r.totalReturnLossTaka,
      netProfit: acc.netProfit + r.asolNetProfit,
      sales: acc.sales + r.totalSales
    }), { orders: 0, delivered: 0, returnLoss: 0, netProfit: 0, sales: 0 });
  }, [calculatedRows]);

  const handleSave = () => {
    // We attach the calculated metrics to the rows before saving so dashboard can read them
    const rowsWithMetrics = calculatedRows.map(r => ({
      ...r,
      calculatedNetProfit: r.asolNetProfit,
      calculatedReturnLoss: r.totalReturnLossTaka,
      calculatedTotalSales: r.totalSales
    }));

    const data: DailyAnalysisData = {
      id: uuidv4(),
      date,
      dollarRate,
      totalMgmtSalary,
      totalOfficeCost,
      totalDailyBonus,
      rows: rowsWithMetrics,
      summary: {
        totalProfit: grandTotal.netProfit,
        totalOrders: grandTotal.orders,
        totalReturnLoss: grandTotal.returnLoss,
        totalDelivered: grandTotal.delivered,
        totalSales: grandTotal.sales
      }
    };
    saveAnalysisData(data);
    alert('Daily Analysis & Dashboard Data Saved!');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-blue-600" /> Product Profit Analysis
          </h2>
          <p className="text-sm text-gray-500">Daily breakdown of profit/loss per page</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded shadow">
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded p-1" />
           <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 flex items-center gap-2">
             <Save size={16} /> Save
           </button>
        </div>
      </div>

      {/* Global Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Dollar Rate</label>
          <input type="number" value={dollarRate} onChange={e => setDollarRate(Number(e.target.value))} className="w-full border rounded p-1 mt-1 font-semibold" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Total Mgmt Salary</label>
          <input type="number" value={totalMgmtSalary} onChange={e => setTotalMgmtSalary(Number(e.target.value))} className="w-full border rounded p-1 mt-1" />
          <span className="text-xs text-blue-600">Avg: {avgMgmtSalary.toFixed(1)}</span>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Total Office Cost</label>
          <input type="number" value={totalOfficeCost} onChange={e => setTotalOfficeCost(Number(e.target.value))} className="w-full border rounded p-1 mt-1" />
          <span className="text-xs text-blue-600">Avg: {avgOfficeCost.toFixed(1)}</span>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Total Bonus</label>
          <input type="number" value={totalDailyBonus} onChange={e => setTotalDailyBonus(Number(e.target.value))} className="w-full border rounded p-1 mt-1" />
          <span className="text-xs text-blue-600">Avg: {avgBonus.toFixed(1)}</span>
        </div>
        <div className="bg-gray-50 p-2 rounded border text-center">
          <label className="text-xs font-bold text-gray-500 uppercase">Total Orders</label>
          <p className="text-xl font-bold text-gray-800">{totalOfficeOrders}</p>
        </div>
      </div>

      {/* Massive Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto pb-4">
        <div className="min-w-[2000px] p-2">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-800 text-white uppercase font-bold sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left w-32 sticky left-0 bg-slate-800 z-20">Page Name</th>
                <th className="p-2 text-left w-32">Product</th>
                <th className="p-2 w-16 bg-blue-900">Total Order</th>
                <th className="p-2 w-16 bg-red-900">Return %</th>
                <th className="p-2 w-16">Return Qty</th>
                <th className="p-2 w-16 bg-green-900">Delivered</th>
                
                {/* Inputs */}
                <th className="p-2 w-20 bg-gray-700">Sale Price</th>
                <th className="p-2 w-20 bg-gray-700">Maler Dam</th>
                <th className="p-2 w-20 bg-gray-700">Total Ad($)</th>
                <th className="p-2 w-20 bg-gray-700">Pg. Salary</th>
                
                {/* Costs per Unit */}
                <th className="p-2 w-16 text-gray-300">Unit Ad(Tk)</th>
                <th className="p-2 w-16 text-gray-300">Pg. Sal(Avg)</th>
                <th className="p-2 w-16 text-gray-300">Mng. Sal</th>
                <th className="p-2 w-16 text-gray-300">Office</th>
                <th className="p-2 w-16 text-gray-300">Bonus</th>
                <th className="p-2 w-16 text-gray-300">COD</th>
                <th className="p-2 w-16 bg-gray-700">Pack</th>
                <th className="p-2 w-16 bg-gray-700">Delivery</th>
                
                {/* Results */}
                <th className="p-2 w-24 bg-red-800" title="Cost of Goods Sold + Operations (No Maler Dam)">Total Return Loss</th>
                <th className="p-2 w-20" title="Return Loss / Delivered Qty">Unit Ret Chrg</th>
                <th className="p-2 w-24 font-bold bg-slate-700">Total Cost/Unit</th>
                <th className="p-2 w-24 font-bold bg-green-700">Per Pich Profit</th>
                <th className="p-2 w-24 font-bold bg-blue-700">NET PROFIT</th>
                <th className="p-2 w-24 bg-gray-700">Hazira/Adj</th>
                <th className="p-2 w-24 font-bold bg-slate-900 text-yellow-400">FINAL PROFIT</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calculatedRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-1 sticky left-0 bg-white z-10 border-r">
                    <input type="text" value={row.pageName} onChange={e => updateRow(row.id, 'pageName', e.target.value)} className="w-full border rounded px-1 py-1 font-medium" placeholder="Page..." />
                  </td>
                  <td className="p-1">
                    <input type="text" value={row.productName} onChange={e => updateRow(row.id, 'productName', e.target.value)} className="w-full border rounded px-1 py-1" placeholder="Product..." />
                  </td>
                  <td className="p-1 bg-blue-50">
                    <input type="number" value={row.totalOrders} onChange={e => updateRow(row.id, 'totalOrders', e.target.value)} className="w-full border border-blue-200 rounded px-1 py-1 font-bold text-center" />
                  </td>
                  <td className="p-1 bg-red-50">
                    <input type="number" value={row.returnPercent} onChange={e => updateRow(row.id, 'returnPercent', e.target.value)} className="w-full border border-red-200 rounded px-1 py-1 text-center" />
                  </td>
                  <td className="p-1 text-center font-mono">{row.returnCount}</td>
                  <td className="p-1 text-center font-bold bg-green-50 text-green-700">{row.deliveredCount}</td>
                  
                  {/* Inputs */}
                  <td className="p-1"><input type="number" value={row.salePrice} onChange={e => updateRow(row.id, 'salePrice', e.target.value)} className="w-full border rounded px-1" /></td>
                  <td className="p-1"><input type="number" value={row.purchaseCost} onChange={e => updateRow(row.id, 'purchaseCost', e.target.value)} className="w-full border rounded px-1" /></td>
                  <td className="p-1"><input type="number" value={row.pageTotalAdDollar} onChange={e => updateRow(row.id, 'pageTotalAdDollar', e.target.value)} className="w-full border rounded px-1" /></td>
                  <td className="p-1"><input type="number" value={row.pageTotalSalary} onChange={e => updateRow(row.id, 'pageTotalSalary', e.target.value)} className="w-full border rounded px-1" /></td>

                  {/* Calculated Costs */}
                  <td className="p-1 text-gray-500">{Math.round(row.unitAdCost)}</td>
                  <td className="p-1 text-gray-500">{Math.round(row.unitPageSalary)}</td>
                  <td className="p-1 text-gray-500">{Math.round(row.avgMgmtSalary)}</td>
                  <td className="p-1 text-gray-500">{Math.round(row.avgOfficeCost)}</td>
                  <td className="p-1 text-gray-500">{Math.round(row.avgBonus)}</td>
                  <td className="p-1 text-gray-500">{Math.round(row.unitCod)}</td>
                  
                  <td className="p-1"><input type="number" value={row.packagingCost} onChange={e => updateRow(row.id, 'packagingCost', e.target.value)} className="w-full border rounded px-1 bg-gray-50" /></td>
                  <td className="p-1"><input type="number" value={row.deliveryCharge} onChange={e => updateRow(row.id, 'deliveryCharge', e.target.value)} className="w-full border rounded px-1 bg-gray-50" /></td>
                  
                  {/* Result Columns */}
                  <td className="p-1 text-red-600 font-medium">{Math.round(row.totalReturnLossTaka).toLocaleString()}</td>
                  <td className="p-1 text-red-400">{Math.round(row.unitReturnCharge)}</td>
                  <td className="p-1 font-bold">{Math.round(row.finalUnitTotalCost).toLocaleString()}</td>
                  <td className={`p-1 font-bold ${row.perPichProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(row.perPichProfit)}</td>
                  <td className={`p-1 font-bold text-lg ${row.totalNetProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{Math.round(row.totalNetProfit).toLocaleString()}</td>
                  
                  <td className="p-1"><input type="number" value={row.haziraBonus} onChange={e => updateRow(row.id, 'haziraBonus', e.target.value)} className="w-full border rounded px-1 text-red-500" /></td>
                  <td className={`p-1 font-bold text-lg border-l-2 border-slate-300 ${row.asolNetProfit >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>{Math.round(row.asolNetProfit).toLocaleString()}</td>
                  
                  <td className="p-1 text-center">
                    <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
               <tr>
                 <td className="p-2 sticky left-0 bg-gray-100 border-r">TOTALS</td>
                 <td></td>
                 <td className="p-2 text-center text-blue-700">{grandTotal.orders}</td>
                 <td></td>
                 <td className="p-2 text-center text-red-600">{Math.round(calculatedRows.reduce((a,b)=>a+b.returnCount,0))}</td>
                 <td className="p-2 text-center text-green-700">{grandTotal.delivered}</td>
                 <td colSpan={10} className="text-right pr-4 text-gray-500">Total Return Loss:</td>
                 <td className="p-2 text-red-600">{grandTotal.returnLoss.toLocaleString()}</td>
                 <td colSpan={3} className="text-right pr-4 text-gray-500">Total Net Profit:</td>
                 <td className="p-2 text-xl text-blue-800">{grandTotal.netProfit.toLocaleString()}</td>
                 <td></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <div className="mt-4">
        <button onClick={addRow} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700">
          <Plus size={18} /> Add New Page Row
        </button>
      </div>
    </div>
  );
};

export default ProfitAnalysis;