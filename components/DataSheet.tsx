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
      // Calculate daily aggregates for distribution
      const totalDailyOrders = day.rows.reduce((sum, r) => sum + Number(r.totalOrders), 0);
      const avgMgmt = totalDailyOrders > 0 ? Number(day.totalMgmtSalary) / totalDailyOrders : 0;
      const avgOffice = totalDailyOrders > 0 ? Number(day.totalOfficeCost) / totalDailyOrders : 0;
      const avgBonus = totalDailyOrders > 0 ? Number(day.totalDailyBonus) / totalDailyOrders : 0;

      day.rows.forEach((row: AnalysisRow) => {
        // Recalculate metrics for display
        const tOrders = Number(row.totalOrders);
        const returnCount = Math.round((tOrders * Number(row.returnPercent)) / 100);
        const deliveredCount = tOrders - returnCount;
        
        const effectiveRate = Number(row.dollarRate) || Number(day.dollarRate);
        
        // Costs Totals for this batch
        const totalPurchaseDelivered = Number(row.purchaseCost) * deliveredCount; 
        const totalAdTk = Number(row.pageTotalAdDollar) * effectiveRate;
        
        // Distributed Costs (Total for batch)
        const totalMgmt = avgMgmt * tOrders;
        const totalOffice = avgOffice * tOrders;
        const totalBonus = avgBonus * tOrders;
        
        const totalDelivery = Number(row.deliveryCharge) * tOrders;
        const totalPacking = Number(row.packagingCost) * tOrders;
        
        // COD (Only on delivered)
        const unitCod = (Number(row.salePrice) * Number(row.codChargePercent)) / 100;
        const totalCod = unitCod * deliveredCount;

        // Return Loss Calculation (Cost of operations for returned items)
        const totalOpsForBatch = totalAdTk + Number(row.pageTotalSalary) + totalMgmt + totalOffice + totalBonus + totalDelivery + totalPacking;
        const unitOpCost = tOrders > 0 ? totalOpsForBatch / tOrders : 0;
        const totalReturnLoss = unitOpCost * returnCount;

        // Total Expense
        const totalCostDisplayed = totalPurchaseDelivered + totalOpsForBatch + totalCod + (Number(row.haziraBonus)||0);

        // Final Profit
        const totalRevenue = Number(row.salePrice) * deliveredCount;
        const netProfit = totalRevenue - totalCostDisplayed;
        
        // Per Pich Profit
        const perPichProfit = deliveredCount > 0 ? netProfit / deliveredCount : 0;

        flattened.push({
          date: day.date,
          pageName: row.pageName,
          productName: row.productName,
          totalOrders: tOrders,
          returnPercent: row.returnPercent,
          returnCount: returnCount,
          deliveredCount: deliveredCount,
          
          // Columns
          mallerDam: totalPurchaseDelivered,
          totalAdTk: totalAdTk,
          dollar: row.pageTotalAdDollar,
          rate: effectiveRate,
          pageSalary: row.pageTotalSalary,
          mgmtSalary: totalMgmt,
          bonus: totalBonus,
          officeCost: totalOffice,
          cod: totalCod,
          returnCost: totalReturnLoss,
          deliveryChrg: totalDelivery,
          packingCost: totalPacking,
          
          totalCost: totalCostDisplayed,
          sale: totalRevenue,
          perPichProfit: perPichProfit,
          totalReturnTk: totalReturnLoss,
          netProfit: netProfit
        });
      });
    });

    return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filterDate]);

  const filteredRows = allRows.filter(r => filterDate ? r.date === filterDate : true);

  // Footer Totals
  const totals = useMemo(() => {
    return filteredRows.reduce((acc, r) => ({
      mallerDam: acc.mallerDam + r.mallerDam,
      adTk: acc.adTk + r.totalAdTk,
      pageSal: acc.pageSal + r.pageSalary,
      mgmtSal: acc.mgmtSal + r.mgmtSalary,
      bonus: acc.bonus + r.bonus,
      office: acc.office + r.officeCost,
      cod: acc.cod + r.cod,
      returnLoss: acc.returnLoss + r.returnCost,
      del: acc.del + r.deliveryChrg,
      pack: acc.pack + r.packingCost,
      totalCost: acc.totalCost + r.totalCost,
      sale: acc.sale + r.sale,
      orders: acc.orders + r.totalOrders,
      returnCount: acc.returnCount + r.returnCount,
      deliveredCount: acc.deliveredCount + r.deliveredCount,
      netProfit: acc.netProfit + r.netProfit
    }), { 
      mallerDam: 0, adTk: 0, pageSal: 0, mgmtSal: 0, bonus: 0, office: 0, cod: 0, 
      returnLoss: 0, del: 0, pack: 0, totalCost: 0, sale: 0, orders: 0, returnCount: 0, deliveredCount: 0, netProfit: 0 
    });
  }, [filteredRows]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Main Calculation Sheet</h2>
          <p className="text-gray-500">Manage and view all daily entries</p>
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
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b">
              <tr>
                <th className="p-3 text-left border-r sticky left-0 bg-slate-50">Date</th>
                <th className="p-3 text-left border-r sticky left-24 bg-slate-50">Page Name</th>
                <th className="p-3 text-left border-r sticky left-56 bg-slate-50">Product Name</th>
                
                <th className="p-3 bg-blue-50 text-blue-800">Maller Dam</th>
                <th className="p-3 bg-gray-100 font-bold text-gray-700">Ad Cost</th>
                <th className="p-3">Page Sallary</th>
                <th className="p-3">Mng Sallary</th>
                <th className="p-3">Bonus</th>
                <th className="p-3">Office Cost</th>
                <th className="p-3">COD</th>
                <th className="p-3 text-red-600 bg-red-50">Return Cost</th>
                <th className="p-3">Delivery Chrg</th>
                <th className="p-3">Packing Cost</th>
                
                <th className="p-3 font-bold bg-gray-100 border-l border-r">TOTAL COST</th>
                <th className="p-3 font-bold text-blue-700 bg-blue-50">Sale</th>
                <th className="p-3 bg-green-50 text-green-700">Per Pich Profit</th>
                <th className="p-3 text-red-500">Total Return Tk.</th>
                
                <th className="p-3 bg-blue-50">Total Order</th>
                <th className="p-3 bg-red-50">Parcent</th>
                <th className="p-3">Retun Pich</th>
                <th className="p-3 bg-green-50">Delivered Order</th>
                
                <th className="p-3 font-bold text-white bg-slate-800">NET PROFIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={22} className="p-8 text-center text-gray-400">No data found.</td></tr>
              ) : filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 text-left font-mono border-r sticky left-0 bg-white">{row.date}</td>
                  <td className="p-3 text-left font-medium border-r sticky left-24 bg-white">{row.pageName}</td>
                  <td className="p-3 text-left border-r sticky left-56 bg-white text-gray-500">{row.productName}</td>
                  
                  <td className="p-3 bg-blue-50 font-medium">{Math.round(row.mallerDam).toLocaleString()}</td>
                  <td className="p-3 font-bold text-gray-700 bg-gray-50">
                     {Math.round(row.totalAdTk).toLocaleString()}
                     <div className="text-[9px] text-gray-400 font-normal">
                         ${Math.round(row.dollar)} @ {row.rate}
                     </div>
                  </td>
                  <td className="p-3">{Math.round(row.pageSalary)}</td>
                  <td className="p-3">{Math.round(row.mgmtSalary)}</td>
                  <td className="p-3">{Math.round(row.bonus)}</td>
                  <td className="p-3">{Math.round(row.officeCost)}</td>
                  <td className="p-3">{Math.round(row.cod)}</td>
                  <td className="p-3 text-red-600 bg-red-50 font-medium">{Math.round(row.returnCost)}</td>
                  <td className="p-3">{Math.round(row.deliveryChrg)}</td>
                  <td className="p-3">{Math.round(row.packingCost)}</td>
                  
                  <td className="p-3 font-bold bg-gray-100 border-l border-r">{Math.round(row.totalCost).toLocaleString()}</td>
                  <td className="p-3 font-bold text-blue-700 bg-blue-50">{Math.round(row.sale).toLocaleString()}</td>
                  <td className={`p-3 font-bold ${row.perPichProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(row.perPichProfit)}</td>
                  <td className="p-3 text-red-500">{Math.round(row.totalReturnTk).toLocaleString()}</td>
                  
                  <td className="p-3 bg-blue-50 font-bold text-blue-800">{row.totalOrders}</td>
                  <td className="p-3 bg-red-50 text-red-800">{row.returnPercent}%</td>
                  <td className="p-3">{row.returnCount}</td>
                  <td className="p-3 bg-green-50 font-bold text-green-700">{row.deliveredCount}</td>
                  
                  <td className={`p-3 font-bold text-white ${row.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    {Math.round(row.netProfit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr className="bg-slate-800 text-white font-bold text-xs shadow-inner">
                 <td colSpan={3} className="p-3 text-right">TOTALS:</td>
                 
                 <td className="p-2 bg-blue-900">{Math.round(totals.mallerDam).toLocaleString()}</td>
                 <td className="p-2 bg-gray-700">{Math.round(totals.adTk).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.pageSal).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.mgmtSal).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.bonus).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.office).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.cod).toLocaleString()}</td>
                 <td className="p-2 bg-red-900">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.del).toLocaleString()}</td>
                 <td className="p-2">{Math.round(totals.pack).toLocaleString()}</td>
                 <td className="p-2 bg-gray-700">{Math.round(totals.totalCost).toLocaleString()}</td>
                 <td className="p-2 bg-blue-900">{Math.round(totals.sale).toLocaleString()}</td>
                 <td className="p-2 bg-green-900"></td>
                 <td className="p-2">{Math.round(totals.returnLoss).toLocaleString()}</td>
                 <td className="p-2 text-center bg-blue-900">{totals.orders}</td>
                 <td className="p-2 bg-red-900"></td>
                 <td className="p-2 text-center">{totals.returnCount}</td>
                 <td className="p-2 text-center bg-green-900">{totals.deliveredCount}</td>
                 
                 <td className={`p-2 text-lg border-l border-gray-600 ${totals.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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