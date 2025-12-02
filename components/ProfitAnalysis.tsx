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

  const updateRow = (id: string, field: keyof AnalysisRow, value: string) => {
    // Helper to allow typing decimals (e.g. "50.") without forcing Number() immediately
    // This state is "dirty" (can contain strings) until Saved
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setRows(rows.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value }; 
            }
            return r;
        }) as any); 
    }
  };

  // --- PREPARE DATA FOR DISPLAY (PER UNIT LOGIC) ---
  const displayRows = useMemo(() => {
    // 1. Calculate Page Aggregates first (for DOLLAR $ column)
    const pageAggregates = new Map<string, number>();
    rows.forEach(r => {
      const current = pageAggregates.get(r.pageName) || 0;
      // Convert to Number safely for aggregation
      pageAggregates.set(r.pageName, current + Number(r.pageTotalAdDollar));
    });

    return rows.map(r => {
      // Safe Conversion for live calculation
      const tOrders = Number(r.totalOrders) || 0;
      const returnCount = Math.round((tOrders * Number(r.returnPercent)) / 100);
      const deliveredCount = tOrders - returnCount;
      const effectiveRate = Number(r.dollarRate) || dollarRate;

      // --- UNIT COSTS (For Display) ---
      const unitAdTk = tOrders > 0 ? (Number(r.pageTotalAdDollar) * effectiveRate) / tOrders : 0;
      const unitSalary = tOrders > 0 ? Number(r.pageTotalSalary) / tOrders : 0;
      
      // Global Unit Costs 
      const dayTotalOrders = rows.reduce((s, row) => s + Number(row.totalOrders), 0) || 1;
      const unitMgmt = totalMgmtSalary / dayTotalOrders;
      const unitOffice = totalOfficeCost / dayTotalOrders;
      const unitBonus = totalDailyBonus / dayTotalOrders;

      const unitDelivery = Number(r.deliveryCharge);
      const unitPacking = Number(r.packagingCost);
      
      // COD per delivered unit (nominal)
      const unitCod = (Number(r.salePrice) * Number(r.codChargePercent)) / 100;
      
      // Return Loss
      const unitReturnLoss = deliveredCount > 0 ? (r.calculatedReturnLoss || 0) / deliveredCount : 0; 

      // Total Cost Per Unit (Delivered Basis)
      const unitTotalCost = Number(r.purchaseCost) + unitAdTk + unitSalary + unitMgmt + unitBonus + unitOffice + unitCod + unitReturnLoss + unitDelivery + unitPacking;

      // Net Profit Check
      const calculatedNet = r.calculatedNetProfit || 0;
      const perPichProfit = Number(r.salePrice) - unitTotalCost;

      return {
        ...r,
        returnCount,
        deliveredCount,
        pageTotalAdDollarDisplay: pageAggregates.get(r.pageName) || 0,
        
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
        perPichProfit,
        effectiveRate
      };
    });
  }, [rows, dollarRate, totalMgmtSalary, totalOfficeCost, totalDailyBonus]);

  const totals = useMemo(() => {
    return displayRows.reduce((acc, r) => {
        const tOrders = Number(r.totalOrders);
        const delivered = r.deliveredCount;
        
        return {
          mallerDam: acc.mallerDam + (Number(r.purchaseCost) * tOrders),
          pageAdDollar: acc.pageAdDollar + Number(r.pageTotalAdDollar),
          adTk: acc.adTk + (Number(r.pageTotalAdDollar) * r.effectiveRate),
          pageSalary: acc.pageSalary + Number(r.pageTotalSalary),
          mgmt: acc.mgmt + (r.unitMgmt * tOrders),
          bonus: acc.bonus + (r.unitBonus * tOrders),
          office: acc.office + (r.unitOffice * tOrders),
          cod: acc.cod + (r.unitCod * delivered),
          returnLoss: acc.returnLoss + (r.calculatedReturnLoss || 0),
          delivery: acc.delivery + (r.unitDelivery * tOrders),
          packing: acc.packing + (r.unitPacking * tOrders),
          
          totalCost: acc.totalCost + (r.unitTotalCost * delivered),
          
          sales: acc.sales + (Number(r.salePrice) * delivered),
          netProfit: acc.netProfit + r.calculatedNet,
          orders: acc.orders + tOrders,
          deliveredCount: acc.deliveredCount + delivered
        };
    }, { 
      mallerDam: 0, pageAdDollar: 0, adTk: 0, pageSalary: 0, mgmt: 0, bonus: 0, office: 0, cod: 0, returnLoss: 0, delivery: 0, packing: 0, totalCost: 0, sales: 0, netProfit: 0, orders: 0, deliveredCount: 0 
    });
  }, [displayRows]);

  const handleSave = () => {
    // Strictly convert all inputs to Numbers before saving
    const cleanRows = rows.map(r => ({
        ...r,
        purchaseCost: Number(r.purchaseCost),
        salePrice: Number(r.salePrice),
        totalOrders: Number(r.totalOrders),
        returnPercent: Number(r.returnPercent)
    }));

    const rawData: DailyAnalysisData = {
      id: uuidv4(),
      date,
      dollarRate,
      totalMgmtSalary,
      totalOfficeCost,
      totalDailyBonus,
      rows: cleanRows,
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
                
                <th className="p-2 bg-blue-50 text-blue-900 w-24">MALLER DAM</th>
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
                <th className="p-2 font-bold text-blue-700 bg-blue-50 w-24">SALE</th>
                <th className="p-2 text-green-700">PER PICH PROFIT</th>
                <th className="p-2 text-red-500">TOTAL RETURN TK.</th>
                
                <th className="p-2 bg-slate-800 text-white w-20">TOTAL ORDER</th>
                <th className="p-2 bg-red-50 text-red-800 w-16">PARCENT</th>
                <th className="p-2 bg-green-50 text-green-800 border-l border-green-200">NET PROFIT</th>
                <th className="p-2 no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-2 text-left sticky left-0 bg-white border-r text-gray-500 font-mono whitespace-nowrap">{date}</td>
                  <td className="p-2 text-left sticky left-20 bg-white border-r font-bold">{row.pageName}</td>
                  <td className="p-2 text-left sticky left-48 bg-white border-r text-gray-600">{row.productName}</td>

                  {/* EDITABLE MALLER DAM */}
                  <td className="p-2 bg-blue-50">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={row.purchaseCost}
                      onChange={e => updateRow(row.id, 'purchaseCost', e.target.value)}
                      className="w-full bg-transparent text-right outline-none focus:border-b border-blue-500"
                    />
                  </td>

                  <td className="p-2 bg-yellow-50 text-yellow-800 font-bold">${Math.round(row.pageTotalAdDollarDisplay)}</td>
                  <td className="p-2 text-gray-500 font-mono">{row.effectiveRate}</td>
                  <td className="p-2">{row.unitAdTk.toFixed(2)}</td>
                  <td className="p-2">{row.unitSalary.toFixed(2)}</td>
                  <td className="p-2">{row.unitMgmt.toFixed(2)}</td>
                  <td className="p-2">{row.unitBonus.toFixed(2)}</td>
                  <td className="p-2">{row.unitOffice.toFixed(2)}</td>
                  <td className="p-2">{row.unitCod.toFixed(2)}</td>
                  <td className="p-2 text-red-600">{row.unitReturnLoss.toFixed(2)}</td>
                  <td className="p-2">{row.unitDelivery.toFixed(2)}</td>
                  <td className="p-2">{row.unitPacking.toFixed(2)}</td>
                  
                  <td className="p-2 font-bold bg-gray-100 border-x">{row.unitTotalCost.toFixed(2)}</td>
                  
                  {/* EDITABLE SALE */}
                  <td className="p-2 font-bold text-blue-700 bg-blue-50">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={row.salePrice}
                      onChange={e => updateRow(row.id, 'salePrice', e.target.value)}
                      className="w-full bg-transparent text-right outline-none focus:border-b border-blue-500 text-blue-700 font-bold"
                    />
                  </td>
                  
                  <td className={`p-2 font-bold ${row.perPichProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.perPichProfit.toFixed(2)}
                  </td>
                  
                  <td className="p-2 text-red-500 font-bold">{row.calculatedReturnLoss?.toFixed(2)}</td>
                  
                  {/* EDITABLE TOTAL ORDER */}
                  <td className="p-2 bg-slate-800 text-white font-bold text-center">
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={row.totalOrders}
                      onChange={e => updateRow(row.id, 'totalOrders', e.target.value)}
                      className="w-full bg-transparent text-center outline-none focus:border-b border-white text-white font-bold"
                    />
                  </td>

                  {/* EDITABLE PERCENT */}
                  <td className="p-2 bg-red-50 text-red-800 text-center">
                     <input 
                      type="text" 
                      inputMode="decimal"
                      value={row.returnPercent}
                      onChange={e => updateRow(row.id, 'returnPercent', e.target.value)}
                      className="w-full bg-transparent text-center outline-none focus:border-b border-red-500 text-red-800"
                    />
                  </td>

                  <td className={`p-2 font-bold border-l border-green-100 ${row.calculatedNet >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {Math.round(row.calculatedNet).toLocaleString()}
                  </td>
                  
                  <td className="p-2 text-center no-print">
                    <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-200 text-slate-800 font-bold text-xs border-t-2 border-slate-300">
                 <td colSpan={3} className="p-3 text-right">TOTALS (Day):</td>
                 
                 <td className="p-2 bg-blue-100 text-blue-900">{Math.round(totals.mallerDam).toLocaleString()}</td>
                 <td className="p-2 bg-yellow-100 text-yellow-900">${Math.round(totals.pageAdDollar)}</td>
                 <td className="p-2"></td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.adTk).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.pageSalary).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.mgmt).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.bonus).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.office).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.cod).toLocaleString()}</td>
                 <td className="p-2 bg-red-200 text-red-900">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.delivery).toLocaleString()}</td>
                 <td className="p-2 bg-gray-100">{Math.round(totals.packing).toLocaleString()}</td>
                 <td className="p-2 font-bold">{Math.round(totals.totalCost).toLocaleString()}</td>
                 <td className="p-2 font-bold text-blue-800 bg-blue-100">{Math.round(totals.sales).toLocaleString()}</td>
                 <td className="p-2"></td>
                 <td className="p-2 bg-red-200 text-red-900">{Math.round(totals.returnLoss).toLocaleString()}</td>

                 <td className="p-2 bg-slate-900 text-white text-center">{totals.orders}</td>
                 <td className="p-2"></td>
                 <td className={`p-2 border-l border-slate-300 ${totals.netProfit >= 0 ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
                    {Math.round(totals.netProfit).toLocaleString()}
                 </td>
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