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
      const totalDailyOrders = day.rows.reduce((sum, r) => sum + r.totalOrders, 0);
      const avgMgmt = totalDailyOrders > 0 ? day.totalMgmtSalary / totalDailyOrders : 0;
      const avgOffice = totalDailyOrders > 0 ? day.totalOfficeCost / totalDailyOrders : 0;
      const avgBonus = totalDailyOrders > 0 ? day.totalDailyBonus / totalDailyOrders : 0;

      day.rows.forEach((row: AnalysisRow) => {
        // Recalculate metrics for display
        const returnCount = Math.round((row.totalOrders * row.returnPercent) / 100);
        const deliveredCount = row.totalOrders - returnCount;
        
        const effectiveRate = row.dollarRate || day.dollarRate;
        
        // Costs Totals for this batch
        const totalPurchase = row.purchaseCost * row.totalOrders; // Maler Dam (Total for batch)
        const totalAdTk = row.pageTotalAdDollar * effectiveRate;
        
        // Distributed Costs (Total for batch)
        const totalMgmt = avgMgmt * row.totalOrders;
        const totalOffice = avgOffice * row.totalOrders;
        const totalBonus = avgBonus * row.totalOrders;
        
        // Logistics (Total)
        // Note: Delivery/Pack is usually per order sent? Or per delivered? 
        // Standard practice: Expense incurred for ALL orders sent.
        const totalDelivery = row.deliveryCharge * row.totalOrders;
        const totalPacking = row.packagingCost * row.totalOrders;
        
        // COD (Only on delivered)
        const unitCod = (row.salePrice * row.codChargePercent) / 100;
        const totalCod = unitCod * deliveredCount;

        // Return Loss Calculation (Cost of operations for returned items)
        const unitOpCost = (totalAdTk/row.totalOrders) + (row.pageTotalSalary/row.totalOrders) + avgMgmt + avgOffice + avgBonus + row.deliveryCharge + row.packagingCost;
        const totalReturnLoss = unitOpCost * returnCount;

        // Final Profit
        // Profit = Sales - (PurchaseOfDelivered + AllOpCosts + ReturnLoss) ?? 
        // Simpler: Profit = (UnitProfit * Delivered) - Adjustments
        // We use the stored calculatedNetProfit if available to match Analysis sheet exactly, else re-calc
        const netProfit = row.calculatedNetProfit !== undefined ? row.calculatedNetProfit : 0;
        
        flattened.push({
          date: day.date,
          pageName: row.pageName,
          productName: row.productName,
          totalOrders: row.totalOrders,
          
          // Columns matching screenshot
          totalMalerDam: totalPurchase,
          dollar: row.pageTotalAdDollar,
          rate: effectiveRate,
          totalAdTk: totalAdTk,
          pageSalary: row.pageTotalSalary,
          mgmtSalary: totalMgmt,
          bonus: totalBonus,
          officeCost: totalOffice,
          cod: totalCod,
          returnCost: totalReturnLoss,
          deliveryChrg: totalDelivery,
          packingCost: totalPacking,
          
          totalCost: totalPurchase + totalAdTk + row.pageTotalSalary + totalMgmt + totalBonus + totalOffice + totalCod + totalDelivery + totalPacking, // This is a "Gross Spend" approximation
          
          sale: row.calculatedTotalSales || (row.salePrice * deliveredCount),
          netProfit: netProfit
        });
      });
    });

    return flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filterDate]); // Re-calc if data changes, currently static load

  const filteredRows = allRows.filter(r => filterDate ? r.date === filterDate : true);

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
                <th className="p-3 text-left border-r">Product Name</th>
                <th className="p-3 bg-blue-50 text-blue-800">Maler Dam</th>
                <th className="p-3">Dollar ($)</th>
                <th className="p-3">Rate</th>
                <th className="p-3 bg-gray-50">Ad Tk</th>
                <th className="p-3">Page Salary</th>
                <th className="p-3">Mng Salary</th>
                <th className="p-3">Bonus</th>
                <th className="p-3">Office Cost</th>
                <th className="p-3">COD</th>
                <th className="p-3 text-red-600 bg-red-50">Return Cost</th>
                <th className="p-3">Delivery Chrg</th>
                <th className="p-3">Packing Cost</th>
                <th className="p-3 font-bold bg-gray-100">TOTAL EXP</th>
                <th className="p-3 font-bold text-blue-700 bg-blue-50">SALE</th>
                <th className="p-3 font-bold text-white bg-slate-800">NET PROFIT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={18} className="p-8 text-center text-gray-400">No data found.</td></tr>
              ) : filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-3 text-left font-mono border-r sticky left-0 bg-white">{row.date}</td>
                  <td className="p-3 text-left font-medium border-r sticky left-24 bg-white">{row.pageName}</td>
                  <td className="p-3 text-left border-r text-gray-500">{row.productName}</td>
                  <td className="p-3 bg-blue-50 font-medium">{Math.round(row.totalMalerDam).toLocaleString()}</td>
                  <td className="p-3">{Math.round(row.dollar)}</td>
                  <td className="p-3 text-gray-500">{row.rate}</td>
                  <td className="p-3 bg-gray-50 font-medium">{Math.round(row.totalAdTk).toLocaleString()}</td>
                  <td className="p-3">{Math.round(row.pageSalary)}</td>
                  <td className="p-3">{Math.round(row.mgmtSalary)}</td>
                  <td className="p-3">{Math.round(row.bonus)}</td>
                  <td className="p-3">{Math.round(row.officeCost)}</td>
                  <td className="p-3">{Math.round(row.cod)}</td>
                  <td className="p-3 text-red-600 bg-red-50 font-medium">{Math.round(row.returnCost)}</td>
                  <td className="p-3">{Math.round(row.deliveryChrg)}</td>
                  <td className="p-3">{Math.round(row.packingCost)}</td>
                  <td className="p-3 font-bold bg-gray-100">{Math.round(row.totalCost).toLocaleString()}</td>
                  <td className="p-3 font-bold text-blue-700 bg-blue-50">{Math.round(row.sale).toLocaleString()}</td>
                  <td className={`p-3 font-bold text-white ${row.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    {Math.round(row.netProfit).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataSheet;