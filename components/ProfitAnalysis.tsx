import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Save, Trash2, Calculator } from 'lucide-react';
import { saveAnalysisData, getAnalysisByDate, recalculateDailyFinancials } from '../services/storage';
import { AnalysisRow, DailyAnalysisData } from '../types';

const ProfitAnalysis: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Global Daily Inputs (Defaults)
  const [dollarRate, setDollarRate] = useState(120);
  const [totalMgmtSalary, setTotalMgmtSalary] = useState(0);
  const [totalOfficeCost, setTotalOfficeCost] = useState(0);
  const [totalDailyBonus, setTotalDailyBonus] = useState(0);

  // Rows
  const [rows, setRows] = useState<AnalysisRow[]>([]);

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
      setRows([]);
      setTotalMgmtSalary(0);
      setTotalOfficeCost(0);
      setTotalDailyBonus(0);
    }
  }, [date]);

  const removeRow = (id: string) => {
    if(confirm("Are you sure you want to delete this row?")) {
      const updatedRows = rows.filter(r => r.id !== id);
      setRows(updatedRows);
    }
  };

  const updateRow = (id: string, field: keyof AnalysisRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: Number(value) || (field === 'pageName' || field === 'productName' ? value : 0) } : r));
  };

  // --- CALCULATIONS (Local for Display) ---

  // Total Office Orders (Sum of all page orders)
  const totalOfficeOrders = useMemo(() => rows.reduce((sum, r) => sum + Number(r.totalOrders), 0), [rows]);

  // Derived Globals (Per Order) - Display purpose only, Storage engine does the hard work on save
  const avgMgmtSalary = totalOfficeOrders > 0 ? totalMgmtSalary / totalOfficeOrders : 0;
  const avgOfficeCost = totalOfficeOrders > 0 ? totalOfficeCost / totalOfficeOrders : 0;
  const avgBonus = totalOfficeOrders > 0 ? totalDailyBonus / totalOfficeOrders : 0;

  // Process Rows with Calculations
  const calculatedRows = useMemo(() => {
    return rows.map(r => {
      const returnCount = Math.round((r.totalOrders * r.returnPercent) / 100);
      const deliveredCount = r.totalOrders - returnCount;
      const effectiveRate = r.dollarRate || dollarRate;

      // 1. Costs Totals
      const totalAdTk = r.pageTotalAdDollar * effectiveRate;
      const totalMgmt = avgMgmtSalary * r.totalOrders;
      const totalOffice = avgOfficeCost * r.totalOrders;
      const totalBonus = avgBonus * r.totalOrders;
      const totalDelivery = r.deliveryCharge * r.totalOrders;
      const totalPacking = r.packagingCost * r.totalOrders;
      
      // COD only on Delivered
      const unitCod = (r.salePrice * r.codChargePercent) / 100;
      const totalCod = unitCod * deliveredCount;

      // Unit Operational Cost (for Return Loss)
      // Ops Cost = Ad + Sal + Mgmt + Office + Bonus + Del + Pack
      const totalOpsForBatch = totalAdTk + r.pageTotalSalary + totalMgmt + totalOffice + totalBonus + totalDelivery + totalPacking;
      const unitOpCost = r.totalOrders > 0 ? totalOpsForBatch / r.totalOrders : 0;
      
      // Return Loss
      // Formula: Total Cost (excluding Maler Dam) * Return Pitch
      const totalReturnLossTaka = unitOpCost * returnCount;

      const totalPurchaseDelivered = r.purchaseCost * deliveredCount; 
      
      // Expenses = Delivered COGS + All Ops + COD.
      const totalCostDisplayed = totalPurchaseDelivered + totalOpsForBatch + totalCod + (r.haziraBonus || 0);

      // Sales
      const totalRevenue = r.salePrice * deliveredCount;

      // Net Profit
      const calculatedNet = totalRevenue - totalCostDisplayed;

      // Per Pich Profit
      const perPichProfit = deliveredCount > 0 ? calculatedNet / deliveredCount : 0;

      return {
        ...r,
        returnCount,
        deliveredCount,
        totalPurchaseDelivered,
        totalAdTk,
        totalMgmt,
        totalOffice,
        totalBonus,
        totalDelivery,
        totalPacking,
        totalCod,
        totalReturnLossTaka,
        totalCostDisplayed,
        totalSales: totalRevenue,
        asolNetProfit: calculatedNet,
        perPichProfit,
        effectiveRate
      };
    });
  }, [rows, dollarRate, avgMgmtSalary, avgOfficeCost, avgBonus]);

  const totals = useMemo(() => {
    return calculatedRows.reduce((acc, r) => ({
      mallerDam: acc.mallerDam + r.totalPurchaseDelivered,
      adTk: acc.adTk + r.totalAdTk,
      pageSal: acc.pageSal + r.pageTotalSalary,
      mgmtSal: acc.mgmtSal + r.totalMgmt,
      bonus: acc.bonus + r.totalBonus,
      office: acc.office + r.totalOffice,
      cod: acc.cod + r.totalCod,
      returnLoss: acc.returnLoss + r.totalReturnLossTaka,
      del: acc.del + r.totalDelivery,
      pack: acc.pack + r.totalPacking,
      totalCost: acc.totalCost + r.totalCostDisplayed,
      sale: acc.sale + r.totalSales,
      orders: acc.orders + Number(r.totalOrders),
      returnCount: acc.returnCount + r.returnCount,
      deliveredCount: acc.deliveredCount + r.deliveredCount,
      netProfit: acc.netProfit + r.asolNetProfit
    }), { 
      mallerDam: 0, adTk: 0, pageSal: 0, mgmtSal: 0, bonus: 0, office: 0, cod: 0, 
      returnLoss: 0, del: 0, pack: 0, totalCost: 0, sale: 0, orders: 0, returnCount: 0, deliveredCount: 0, netProfit: 0 
    });
  }, [calculatedRows]);

  const handleSave = () => {
    const rawData: DailyAnalysisData = {
      id: uuidv4(),
      date,
      dollarRate,
      totalMgmtSalary,
      totalOfficeCost,
      totalDailyBonus,
      rows: rows,
      summary: undefined
    };

    const calculatedData = recalculateDailyFinancials(rawData);
    saveAnalysisData(calculatedData);
    setRows(calculatedData.rows);
    alert('Analysis Updated, Recalculated & Saved!');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="text-blue-600" /> Product Profit Analysis
          </h2>
          <p className="text-sm text-gray-500">Edit and Analyze Daily Profit</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded shadow">
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded p-1" />
           <div className="bg-blue-50 px-3 py-1 rounded text-blue-800 font-bold text-sm">
             Total Orders: {totalOfficeOrders}
           </div>
           <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 flex items-center gap-2">
             <Save size={16} /> Update & Save
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto pb-4">
        <div className="min-w-max p-2">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-800 text-white uppercase font-bold sticky top-0 z-10">
              <tr>
                <th className="p-2 w-24 text-left sticky left-0 bg-slate-800 border-r border-slate-600">Date</th>
                <th className="p-2 w-32 text-left sticky left-24 bg-slate-800 border-r border-slate-600">Page Name</th>
                <th className="p-2 w-32 text-left sticky left-56 bg-slate-800 border-r border-slate-600">Product Name</th>
                
                <th className="p-2 w-24 bg-blue-900">Maller Dam</th>
                <th className="p-2 w-24 bg-gray-700">Ad Cost</th>
                <th className="p-2 w-20">Page Sallary</th>
                <th className="p-2 w-20">Mng Sallary</th>
                <th className="p-2 w-20">Bonus</th>
                <th className="p-2 w-20">Office Cost</th>
                <th className="p-2 w-20">COD</th>
                <th className="p-2 w-24 bg-red-900">Return Cost</th>
                <th className="p-2 w-20">Delivery Chrg</th>
                <th className="p-2 w-20">Packing Cost</th>
                
                <th className="p-2 w-24 bg-gray-700 font-bold text-yellow-100 border-l border-r">TOTAL COST</th>
                <th className="p-2 w-24 bg-blue-900 font-bold">Sale</th>
                <th className="p-2 w-24 bg-green-800 text-white">Per Pich Profit</th>
                <th className="p-2 w-24 text-red-300">Total Return Tk.</th>
                
                <th className="p-2 w-16 bg-blue-900">Total Order</th>
                <th className="p-2 w-12 bg-red-900">Parcent</th>
                <th className="p-2 w-16">Retun Pich</th>
                <th className="p-2 w-16 bg-green-900">Delivered Order</th>
                
                <th className="p-2 w-24 bg-slate-900 font-bold border-l text-white text-lg">NET PROFIT</th>
                <th className="p-2 w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calculatedRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {/* Date */}
                  <td className="p-2 text-left sticky left-0 bg-white border-r text-gray-500 font-mono">{date}</td>
                  
                  {/* Page Name */}
                  <td className="p-2 sticky left-24 bg-white border-r">
                    <input type="text" value={row.pageName} onChange={e => updateRow(row.id, 'pageName', e.target.value)} className="w-full border rounded px-1 font-medium bg-gray-50" />
                  </td>
                  
                  {/* Product Name */}
                  <td className="p-2 sticky left-56 bg-white border-r">
                    <input type="text" value={row.productName} onChange={e => updateRow(row.id, 'productName', e.target.value)} className="w-full border rounded px-1" />
                  </td>

                  {/* Maller Dam (Delivered Value) */}
                  <td className="p-2 bg-blue-50">
                    <div className="font-bold text-gray-800">{Math.round(row.totalPurchaseDelivered).toLocaleString()}</div>
                    <input type="number" inputMode="decimal" value={row.purchaseCost} onChange={e => updateRow(row.id, 'purchaseCost', e.target.value)} className="w-full text-[10px] border border-blue-200 rounded px-1 mt-1" placeholder="Unit Buy"/>
                  </td>

                  {/* Ad Cost (Total Tk) */}
                  <td className="p-2 font-bold text-gray-600 bg-gray-50">
                      <div>{Math.round(row.totalAdTk).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                         ${Math.round(row.pageTotalAdDollar)} @ {row.effectiveRate}
                      </div>
                  </td>

                  {/* Page Sallary */}
                  <td className="p-2">{Math.round(row.pageTotalSalary).toLocaleString()}</td>

                  {/* Mng Sallary */}
                  <td className="p-2 text-gray-500">{Math.round(row.totalMgmt).toLocaleString()}</td>

                  {/* Bonus */}
                  <td className="p-2 text-gray-500">{Math.round(row.totalBonus).toLocaleString()}</td>

                  {/* Office Cost */}
                  <td className="p-2 text-gray-500">{Math.round(row.totalOffice).toLocaleString()}</td>

                  {/* COD */}
                  <td className="p-2 text-gray-500">{Math.round(row.totalCod).toLocaleString()}</td>

                  {/* Return Cost */}
                  <td className="p-2 text-red-500 font-medium bg-red-50">{Math.round(row.totalReturnLossTaka).toLocaleString()}</td>

                  {/* Delivery Chrg */}
                  <td className="p-2">
                    <div className="font-medium text-gray-700">{Math.round(row.totalDelivery).toLocaleString()}</div>
                    <input type="number" inputMode="decimal" value={row.deliveryCharge} onChange={e => updateRow(row.id, 'deliveryCharge', e.target.value)} className="w-full text-[10px] border rounded px-1 mt-1 text-gray-400" placeholder="Unit"/>
                  </td>

                  {/* Packing Cost */}
                  <td className="p-2">
                    <div className="font-medium text-gray-700">{Math.round(row.totalPacking).toLocaleString()}</div>
                    <input type="number" inputMode="decimal" value={row.packagingCost} onChange={e => updateRow(row.id, 'packagingCost', e.target.value)} className="w-full text-[10px] border rounded px-1 mt-1 text-gray-400" placeholder="Unit"/>
                  </td>

                  {/* TOTAL COST */}
                  <td className="p-2 font-bold bg-slate-100 border-l border-r border-gray-200">{Math.round(row.totalCostDisplayed).toLocaleString()}</td>

                  {/* Sale */}
                  <td className="p-2 bg-blue-50">
                    <div className="font-bold text-blue-700">{Math.round(row.totalSales).toLocaleString()}</div>
                    <input type="number" inputMode="decimal" value={row.salePrice} onChange={e => updateRow(row.id, 'salePrice', e.target.value)} className="w-full text-[10px] border border-blue-200 rounded px-1 mt-1" placeholder="Unit Sale"/>
                  </td>

                  {/* Per Pich Profit */}
                  <td className={`p-2 font-bold bg-green-50 ${row.perPichProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {Math.round(row.perPichProfit).toLocaleString()}
                  </td>

                  {/* Total Return Tk. */}
                  <td className="p-2 text-red-400">{Math.round(row.totalReturnLossTaka).toLocaleString()}</td>

                  {/* Total Order */}
                  <td className="p-1 bg-blue-50">
                      <input type="number" inputMode="decimal" value={row.totalOrders} onChange={e => updateRow(row.id, 'totalOrders', e.target.value)} className="w-12 text-center bg-transparent font-bold text-blue-800" />
                  </td>

                  {/* Parcent */}
                  <td className="p-1 bg-red-50">
                      <input type="number" inputMode="decimal" value={row.returnPercent} onChange={e => updateRow(row.id, 'returnPercent', e.target.value)} className="w-10 text-center bg-transparent text-xs text-red-800" />
                  </td>

                  {/* Retun Pich */}
                  <td className="p-1 text-center text-gray-500 font-medium">{row.returnCount}</td>

                  {/* Delivered Order */}
                  <td className="p-1 bg-green-50 text-center font-bold text-green-700">{row.deliveredCount}</td>

                  {/* NET PROFIT */}
                  <td className={`p-2 font-bold text-lg border-l-2 border-slate-300 ${row.asolNetProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {Math.round(row.asolNetProfit).toLocaleString()}
                  </td>

                  {/* Action */}
                  <td className="p-2 text-center">
                    <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-800 text-white font-bold text-xs shadow-inner">
                 <td colSpan={3} className="p-3 text-right">TOTALS:</td>
                 
                 {/* Maller Dam */}
                 <td className="p-2 bg-blue-900">{Math.round(totals.mallerDam).toLocaleString()}</td>
                 
                 {/* Ad Cost */}
                 <td className="p-2 bg-gray-700">{Math.round(totals.adTk).toLocaleString()}</td>
                 
                 {/* Page Salary */}
                 <td className="p-2">{Math.round(totals.pageSal).toLocaleString()}</td>
                 
                 {/* Mgmt */}
                 <td className="p-2">{Math.round(totals.mgmtSal).toLocaleString()}</td>
                 
                 {/* Bonus */}
                 <td className="p-2">{Math.round(totals.bonus).toLocaleString()}</td>
                 
                 {/* Office */}
                 <td className="p-2">{Math.round(totals.office).toLocaleString()}</td>
                 
                 {/* COD */}
                 <td className="p-2">{Math.round(totals.cod).toLocaleString()}</td>
                 
                 {/* Return Cost */}
                 <td className="p-2 bg-red-900">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 
                 {/* Delivery */}
                 <td className="p-2">{Math.round(totals.del).toLocaleString()}</td>
                 
                 {/* Packing */}
                 <td className="p-2">{Math.round(totals.pack).toLocaleString()}</td>
                 
                 {/* TOTAL COST */}
                 <td className="p-2 bg-gray-700">{Math.round(totals.totalCost).toLocaleString()}</td>
                 
                 {/* Sale */}
                 <td className="p-2 bg-blue-900">{Math.round(totals.sale).toLocaleString()}</td>
                 
                 <td className="p-2 bg-green-900"></td>
                 
                 {/* Return Tk */}
                 <td className="p-2">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 
                 {/* Total Order */}
                 <td className="p-2 text-center bg-blue-900">{totals.orders}</td>
                 
                 <td className="p-2 bg-red-900"></td>
                 <td className="p-2 text-center">{totals.returnCount}</td>
                 <td className="p-2 text-center bg-green-900">{totals.deliveredCount}</td>
                 
                 {/* NET PROFIT */}
                 <td className={`p-2 text-lg border-l border-gray-600 ${totals.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {Math.round(totals.netProfit).toLocaleString()}
                 </td>
                 <td className="p-2"></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalysis;