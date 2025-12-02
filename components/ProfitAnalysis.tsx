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

  // --- PREPARE DATA FOR DISPLAY (PER UNIT LOGIC) ---
  const displayRows = useMemo(() => {
    // 1. Calculate Page Aggregates first (for DOLLAR $ column)
    const pageAggregates = new Map<string, number>();
    rows.forEach(r => {
      const current = pageAggregates.get(r.pageName) || 0;
      pageAggregates.set(r.pageName, current + r.pageTotalAdDollar);
    });

    return rows.map(r => {
      const tOrders = Number(r.totalOrders) || 1; // Avoid divide by zero for unit calcs
      const returnCount = Math.round((tOrders * r.returnPercent) / 100);
      const deliveredCount = tOrders - returnCount;
      const effectiveRate = r.dollarRate || dollarRate;

      // --- UNIT COSTS (For Display) ---
      const unitAdTk = (r.pageTotalAdDollar * effectiveRate) / tOrders;
      const unitSalary = r.pageTotalSalary / tOrders;
      
      // Global Unit Costs (Recalculated in storage, but we derive for display check)
      // Actually, storage saves the 'distributed' amounts indirectly via the total calculation.
      // But we can back-calculate from the stored daily totals or use the row logic if we trust it.
      // Let's re-derive standard Unit Costs based on storage logic for accuracy.
      
      // We need daily total orders for global unit calc
      const dayTotalOrders = rows.reduce((s, row) => s + Number(row.totalOrders), 0) || 1;
      const unitMgmt = totalMgmtSalary / dayTotalOrders;
      const unitOffice = totalOfficeCost / dayTotalOrders;
      const unitBonus = totalDailyBonus / dayTotalOrders;

      const unitDelivery = r.deliveryCharge;
      const unitPacking = r.packagingCost;
      const unitCod = (r.salePrice * r.codChargePercent) / 100;
      const unitReturnLoss = r.calculatedReturnLoss ? (r.calculatedReturnLoss / (deliveredCount || 1)) : 0; 

      // Total Cost Per Unit (Delivered Basis)
      // Sum of all Unit Columns shown in PDF
      const unitTotalCost = r.purchaseCost + unitAdTk + unitSalary + unitMgmt + unitBonus + unitOffice + unitCod + unitReturnLoss + unitDelivery + unitPacking;

      // Net Profit Check
      const calculatedNet = r.calculatedNetProfit || 0;

      return {
        ...r,
        returnCount,
        deliveredCount,
        pageTotalAdDollarDisplay: pageAggregates.get(r.pageName) || 0, // Total Page Ad $
        
        // Unit Values
        unitAdTk,
        unitSalary,
        unitMgmt,
        unitBonus,
        unitOffice,
        unitCod,
        unitReturnLoss,
        unitDelivery,
        unitPacking,
        unitTotalCost,
        
        calculatedNet,
        effectiveRate
      };
    });
  }, [rows, dollarRate, totalMgmtSalary, totalOfficeCost, totalDailyBonus]);

  const totals = useMemo(() => {
    return displayRows.reduce((acc, r) => ({
      // Summing TOTALS for footer (not units)
      totalReturnLoss: acc.totalReturnLoss + (r.calculatedReturnLoss || 0),
      netProfit: acc.netProfit + r.calculatedNet,
      orders: acc.orders + Number(r.totalOrders),
      deliveredCount: acc.deliveredCount + r.deliveredCount
    }), { 
      totalReturnLoss: 0, netProfit: 0, orders: 0, deliveredCount: 0 
    });
  }, [displayRows]);

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
            <Calculator className="text-blue-600" /> Daily Entry Report
          </h2>
        </div>
        <div className="flex gap-2 items-center bg-white p-2 rounded shadow no-print">
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded p-1" />
           <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 flex items-center gap-2">
             <Save size={16} /> Update & Save
           </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-x-auto pb-4">
        <div className="min-w-max p-2">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-slate-50 border-r">DATE</th>
                <th className="p-2 text-left sticky left-20 bg-slate-50 border-r">PAGE NAME</th>
                <th className="p-2 text-left sticky left-48 bg-slate-50 border-r">PRODUCT NAME</th>
                
                <th className="p-2 bg-blue-50 text-blue-900">MALLER DAM</th>
                <th className="p-2 bg-yellow-50 text-yellow-900">DOLLAR ($)</th>
                <th className="p-2">RATE</th>
                <th className="p-2">DOLLER</th>
                <th className="p-2">PAGE SALLARY</th>
                <th className="p-2">MNG SALLARY</th>
                <th className="p-2">BONUS</th>
                <th className="p-2">OFFICE COST</th>
                <th className="p-2">COD</th>
                <th className="p-2 text-red-600">RETURN COST</th>
                <th className="p-2">DELIVERY CHRG</th>
                <th className="p-2">PACKING COST</th>
                
                <th className="p-2 font-bold bg-gray-100 border-x">TOTAL COST</th>
                <th className="p-2 font-bold text-blue-700 bg-blue-50">SALE</th>
                <th className="p-2 text-green-700">PER PICH PROFIT</th>
                <th className="p-2 text-red-500">TOTAL RETURN TK.</th>
                
                <th className="p-2 bg-slate-800 text-white">TOTAL ORDER</th>
                <th className="p-2 bg-red-50 text-red-800">PARCENT</th>
                <th className="p-2 no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-2 text-left sticky left-0 bg-white border-r text-gray-500 font-mono whitespace-nowrap">{date}</td>
                  <td className="p-2 text-left sticky left-20 bg-white border-r font-bold">{row.pageName}</td>
                  <td className="p-2 text-left sticky left-48 bg-white border-r text-gray-600">{row.productName}</td>

                  {/* Maller Dam (Unit Buy) */}
                  <td className="p-2 bg-blue-50 text-gray-900">{row.purchaseCost.toFixed(2)}</td>

                  {/* DOLLAR ($) - Page Total */}
                  <td className="p-2 bg-yellow-50 text-yellow-800 font-bold">${Math.round(row.pageTotalAdDollarDisplay)}</td>

                  {/* RATE */}
                  <td className="p-2 text-gray-500 font-mono">{row.effectiveRate}</td>

                  {/* DOLLER (Unit Ad Tk) */}
                  <td className="p-2">{row.unitAdTk.toFixed(2)}</td>

                  {/* PAGE SALLARY (Unit) */}
                  <td className="p-2">{row.unitSalary.toFixed(2)}</td>

                  {/* MNG SALLARY (Unit) */}
                  <td className="p-2">{row.unitMgmt.toFixed(2)}</td>

                  {/* BONUS (Unit) */}
                  <td className="p-2">{row.unitBonus.toFixed(2)}</td>

                  {/* OFFICE COST (Unit) */}
                  <td className="p-2">{row.unitOffice.toFixed(2)}</td>

                  {/* COD (Unit) */}
                  <td className="p-2">{row.unitCod.toFixed(2)}</td>

                  {/* RETURN COST (Unit Loss distributed on Delivered) */}
                  <td className="p-2 text-red-600">{row.unitReturnLoss.toFixed(2)}</td>

                  {/* DELIVERY CHRG (Unit) */}
                  <td className="p-2">{row.unitDelivery.toFixed(2)}</td>

                  {/* PACKING COST (Unit) */}
                  <td className="p-2">{row.unitPacking.toFixed(2)}</td>

                  {/* TOTAL COST (Unit Sum) */}
                  <td className="p-2 font-bold bg-gray-100 border-x">{row.unitTotalCost.toFixed(2)}</td>

                  {/* SALE (Unit) */}
                  <td className="p-2 font-bold text-blue-700 bg-blue-50">{row.salePrice.toFixed(2)}</td>

                  {/* PER PICH PROFIT */}
                  <td className={`p-2 font-bold ${row.unitTotalCost < row.salePrice ? 'text-green-600' : 'text-red-600'}`}>
                    {(row.salePrice - row.unitTotalCost).toFixed(2)}
                  </td>

                  {/* TOTAL RETURN TK. */}
                  <td className="p-2 text-red-500 font-bold">{row.calculatedReturnLoss?.toFixed(2)}</td>

                  {/* TOTAL ORDER */}
                  <td className="p-2 bg-slate-800 text-white font-bold text-center">{row.totalOrders}</td>

                  {/* PARCENT */}
                  <td className="p-2 bg-red-50 text-red-800 text-center">{row.returnPercent}%</td>
                  
                  <td className="p-2 text-center no-print">
                    <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-200 text-slate-800 font-bold text-xs border-t-2 border-slate-300">
                 <td colSpan={18} className="p-3 text-right">TOTALS:</td>
                 
                 <td className="p-2 bg-red-200 text-red-900">{Math.round(totals.totalReturnLoss).toLocaleString()}</td>
                 <td className="p-2 bg-slate-900 text-white text-center">{totals.orders}</td>
                 <td className="p-2"></td>
                 <td className="p-2 no-print"></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalysis;