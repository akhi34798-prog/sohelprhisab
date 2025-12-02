import React, { useState, useMemo } from 'react';
import { getAnalysisData } from '../services/storage';
import { DailyAnalysisData, AnalysisRow } from '../types';
import { Search, Printer, Download } from 'lucide-react';

const DataSheet: React.FC = () => {
  const [filterDate, setFilterDate] = useState('');
  
  // Flatten data for the sheet
  const allRows = useMemo(() => {
    const rawData = getAnalysisData();
    const flattened: any[] = [];

    rawData.forEach((day: DailyAnalysisData) => {
      // Helper for global unit costs derived from day totals (for display consistency)
      const dayTotalOrders = day.rows.reduce((sum, r) => sum + Number(r.totalOrders), 0) || 1;
      const unitMgmt = day.totalMgmtSalary / dayTotalOrders;
      const unitOffice = day.totalOfficeCost / dayTotalOrders;
      const unitBonus = day.totalDailyBonus / dayTotalOrders;

      // Page Aggregates for DOLLAR ($) column
      const pageAggregates = new Map<string, number>();
      day.rows.forEach(r => {
          const current = pageAggregates.get(r.pageName) || 0;
          pageAggregates.set(r.pageName, current + r.pageTotalAdDollar);
      });

      day.rows.forEach((row: AnalysisRow) => {
        const tOrders = Number(row.totalOrders) || 1;
        const returnCount = Math.round((tOrders * Number(row.returnPercent)) / 100);
        const deliveredCount = tOrders - returnCount;
        
        const effectiveRate = Number(row.dollarRate) || Number(day.dollarRate);
        
        // --- UNIT METRICS ---
        const unitAdTk = (row.pageTotalAdDollar * effectiveRate) / tOrders;
        const unitSalary = row.pageTotalSalary / tOrders;
        const unitCod = (Number(row.salePrice) * Number(row.codChargePercent)) / 100;
        
        // Return Loss per Delivered Unit (Displayed as "RETURN COST")
        const totalReturnLoss = row.calculatedReturnLoss || 0;
        const unitReturnCost = deliveredCount > 0 ? totalReturnLoss / deliveredCount : 0;
        
        // Total Unit Cost (Sum of all unit columns)
        const unitTotalCost = Number(row.purchaseCost) + unitAdTk + unitSalary + unitMgmt + unitBonus + unitOffice + unitCod + unitReturnCost + Number(row.deliveryCharge) + Number(row.packagingCost);

        flattened.push({
          date: day.date,
          pageName: row.pageName,
          productName: row.productName,
          totalOrders: tOrders,
          returnPercent: row.returnPercent,
          
          // Columns (Unit Values)
          mallerDam: row.purchaseCost,
          pageDollarTotal: pageAggregates.get(row.pageName) || 0, // Total Page Ad $
          rate: effectiveRate,
          dollerUnit: unitAdTk,
          pageSalUnit: unitSalary,
          mngSalUnit: unitMgmt,
          bonusUnit: unitBonus,
          officeUnit: unitOffice,
          codUnit: unitCod,
          returnCostUnit: unitReturnCost,
          delUnit: row.deliveryCharge,
          packUnit: row.packagingCost,
          
          totalCostUnit: unitTotalCost,
          saleUnit: row.salePrice,
          
          perPichProfit: row.salePrice - unitTotalCost,
          totalReturnTk: totalReturnLoss,
          netProfit: row.calculatedNetProfit || 0
        });
      });
    });

    return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filterDate]);

  const filteredRows = allRows.filter(r => filterDate ? r.date === filterDate : true);

  // Footer Totals
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      returnLoss: acc.returnLoss + r.totalReturnTk,
      orders: acc.orders + r.totalOrders,
      netProfit: acc.netProfit + r.netProfit
    }), { returnLoss: 0, orders: 0, netProfit: 0 });
  }, [filteredRows]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Main Calculation Sheet</h2>
          <p className="text-gray-500">Daily Entry Report View</p>
        </div>
        <div className="flex gap-2 no-print">
          <div className="flex items-center bg-white border rounded px-2">
             <Search size={16} className="text-gray-400 mr-2"/>
             <input 
               type="date" 
               value={filterDate} 
               onChange={e => setFilterDate(e.target.value)}
               className="p-1 outline-none text-sm"
             />
          </div>
          <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-slate-900 text-sm">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="min-w-max">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-300">
              <tr>
                <th className="p-3 text-left border-r sticky left-0 bg-slate-50">DATE</th>
                <th className="p-3 text-left border-r sticky left-24 bg-slate-50">PAGE NAME</th>
                <th className="p-3 text-left border-r sticky left-56 bg-slate-50">PRODUCT NAME</th>
                
                <th className="p-3 bg-blue-50 text-blue-900">MALLER DAM</th>
                <th className="p-3 bg-yellow-50 text-yellow-900">DOLLAR ($)</th>
                <th className="p-3">RATE</th>
                <th className="p-3">DOLLER</th>
                <th className="p-3">PAGE SALLARY</th>
                <th className="p-3">MNG SALLARY</th>
                <th className="p-3">BONUS</th>
                <th className="p-3">OFFICE COST</th>
                <th className="p-3">COD</th>
                <th className="p-3 text-red-600">RETURN COST</th>
                <th className="p-3">DELIVERY CHRG</th>
                <th className="p-3">PACKING COST</th>
                
                <th className="p-3 font-bold bg-gray-100 border-x">TOTAL COST</th>
                <th className="p-3 font-bold text-blue-700 bg-blue-50">SALE</th>
                <th className="p-3 text-green-700">PER PICH PROFIT</th>
                <th className="p-3 text-red-500">TOTAL RETURN TK.</th>
                
                <th className="p-3 bg-slate-800 text-white">TOTAL ORDER</th>
                <th className="p-3 bg-red-50 text-red-800">PARCENT</th>
                <th className="p-3 bg-green-50 text-green-800 border-l border-green-200">NET PROFIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={22} className="p-8 text-center text-gray-400">No data found.</td></tr>
              ) : filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 text-left font-mono border-r sticky left-0 bg-white whitespace-nowrap">{row.date}</td>
                  <td className="p-3 text-left font-bold border-r sticky left-24 bg-white">{row.pageName}</td>
                  <td className="p-3 text-left border-r sticky left-56 bg-white text-gray-500">{row.productName}</td>
                  
                  <td className="p-3 bg-blue-50">{row.mallerDam.toFixed(2)}</td>
                  <td className="p-3 bg-yellow-50 text-yellow-800 font-bold">${Math.round(row.pageDollarTotal)}</td>
                  <td className="p-3 text-gray-500 font-mono">{row.rate}</td>
                  <td className="p-3">{row.dollerUnit.toFixed(2)}</td>
                  <td className="p-3">{row.pageSalUnit.toFixed(2)}</td>
                  <td className="p-3">{row.mngSalUnit.toFixed(2)}</td>
                  <td className="p-3">{row.bonusUnit.toFixed(2)}</td>
                  <td className="p-3">{row.officeUnit.toFixed(2)}</td>
                  <td className="p-3">{row.codUnit.toFixed(2)}</td>
                  <td className="p-3 text-red-600 font-medium">{row.returnCostUnit.toFixed(2)}</td>
                  <td className="p-3">{row.delUnit.toFixed(2)}</td>
                  <td className="p-3">{row.packUnit.toFixed(2)}</td>
                  
                  <td className="p-3 font-bold bg-gray-100 border-x">{row.totalCostUnit.toFixed(2)}</td>
                  <td className="p-3 font-bold text-blue-700 bg-blue-50">{row.saleUnit.toFixed(2)}</td>
                  
                  <td className={`p-3 font-bold ${row.perPichProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.perPichProfit.toFixed(2)}
                  </td>
                  
                  <td className="p-3 text-red-500 font-bold">{Math.round(row.totalReturnTk).toLocaleString()}</td>
                  <td className="p-3 bg-slate-800 text-white font-bold text-center">{row.totalOrders}</td>
                  <td className="p-3 bg-red-50 text-red-800 text-center">{row.returnPercent}%</td>
                  <td className={`p-3 font-bold border-l border-green-100 ${row.netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {Math.round(row.netProfit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-200 text-slate-800 font-bold text-xs border-t-2 border-slate-300">
                 <td colSpan={18} className="p-3 text-right">TOTALS:</td>
                 
                 <td className="p-3 bg-red-200 text-red-900">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 <td className="p-3 bg-slate-900 text-white text-center">{totals.orders}</td>
                 <td className="p-3"></td>
                 <td className={`p-3 border-l border-slate-300 ${totals.netProfit >= 0 ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'}`}>
                    {Math.round(totals.netProfit).toLocaleString()}
                 </td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSheet;