
import React, { useMemo, useState } from 'react';
import { getAnalysisData } from '../services/storage';
import { Printer, LayoutGrid, List, BarChart3, Download } from 'lucide-react';

const SummaryReport: React.FC = () => {
  const [view, setView] = useState<'matrix' | 'category' | 'detailed'>('category');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');

  const analysisData = getAnalysisData();

  // Filter Data based on selection
  const filteredData = useMemo(() => {
    return analysisData.filter(d => {
      if (selectedDay) return d.date === selectedDay;
      if (selectedMonth) return d.date.startsWith(selectedMonth);
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [analysisData, selectedMonth, selectedDay]);

  // --- VIEW 1: MATRIX DATA ---
  const matrixData = useMemo(() => {
    const dates = filteredData.map(d => d.date);
    const pagesSet = new Set<string>();
    filteredData.forEach(d => d.rows.forEach(r => pagesSet.add(r.pageName)));
    const pages = Array.from(pagesSet).sort();
    
    const rows = filteredData.map(day => {
      const row: any = { date: day.date, total: 0 };
      pages.forEach(page => {
        const pageRows = day.rows.filter(r => r.pageName === page);
        const profit = pageRows.reduce((sum, r) => sum + (r.calculatedNetProfit || 0), 0);
        row[page] = profit;
        row.total += profit;
      });
      return row;
    });

    const totalProfit = rows.reduce((sum, r) => sum + r.total, 0);

    return { dates, pages, rows, totalProfit };
  }, [filteredData]);

  // --- VIEW 2: CATEGORY BREAKDOWN ---
  const categoryData = useMemo(() => {
    let totals = {
      malerDam: 0,
      dollar: 0,
      pageSalary: 0,
      mgmtSalary: 0,
      bonus: 0,
      office: 0,
      cod: 0,
      returnLoss: 0,
      delivery: 0,
      packing: 0,
      sales: 0, // Total Delivered Amount
      netProfit: 0,
      orders: 0,
      delivered: 0
    };

    filteredData.forEach(day => {
      // Global Daily Totals
      totals.mgmtSalary += day.totalMgmtSalary || 0;
      totals.office += day.totalOfficeCost || 0;
      totals.bonus += day.totalDailyBonus || 0;

      day.rows.forEach(row => {
        const delivered = row.totalOrders - Math.round((row.totalOrders * row.returnPercent)/100);
        const effectiveRate = row.dollarRate || day.dollarRate;
        const purchaseCost = row.purchaseCost * row.totalOrders; // Total Goods Value processed
        
        totals.malerDam += purchaseCost;
        totals.dollar += (row.pageTotalAdDollar * effectiveRate);
        totals.pageSalary += row.pageTotalSalary;
        
        totals.delivery += (row.deliveryCharge * row.totalOrders);
        totals.packing += (row.packagingCost * row.totalOrders);
        
        // COD only on delivered
        totals.cod += ((row.salePrice * row.codChargePercent)/100) * delivered;
        
        totals.returnLoss += (row.calculatedReturnLoss || 0);
        totals.sales += (row.calculatedTotalSales || 0);
        totals.netProfit += (row.calculatedNetProfit || 0);
        totals.orders += row.totalOrders;
        totals.delivered += delivered;
      });
    });
    
    // Total Salary includes Page Specific + Management
    const totalSalaryCombined = totals.pageSalary + totals.mgmtSalary;

    return { ...totals, totalSalaryCombined };
  }, [filteredData]);

  // --- VIEW 3: DETAILED DAILY ---
  const detailedDaily = useMemo(() => {
    return filteredData.map(day => {
       const dayTotalProfit = day.rows.reduce((s, r) => s + (r.calculatedNetProfit||0), 0);
       const dayTotalOrders = day.rows.reduce((s, r) => s + r.totalOrders, 0);
       
       // Group by Page
       const pageGroups = new Map();
       day.rows.forEach(r => {
         if (!pageGroups.has(r.pageName)) pageGroups.set(r.pageName, { name: r.pageName, orders: 0, ad: 0, profit: 0 });
         const g = pageGroups.get(r.pageName);
         g.orders += r.totalOrders;
         g.ad += (r.pageTotalAdDollar * (r.dollarRate || day.dollarRate));
         g.profit += (r.calculatedNetProfit || 0);
       });

       return {
         date: day.date,
         pages: Array.from(pageGroups.values()),
         totalProfit: dayTotalProfit,
         totalOrders: dayTotalOrders
       };
    });
  }, [filteredData]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div>
           <h2 className="text-3xl font-bold text-gray-800">Summary Report</h2>
           <p className="text-gray-500">Monthly breakdown and daily profit analysis</p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
           <div className="flex border rounded overflow-hidden">
             <button onClick={() => setView('matrix')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'matrix' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}><LayoutGrid size={16}/> Matrix</button>
             <button onClick={() => setView('category')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'category' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}><BarChart3 size={16}/> Category</button>
             <button onClick={() => setView('detailed')} className={`px-3 py-2 text-sm flex items-center gap-1 ${view === 'detailed' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}><List size={16}/> Detailed</button>
           </div>
           
           <div className="h-6 w-px bg-gray-300 mx-2"></div>
           
           <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500">MONTH:</span>
             <input type="month" value={selectedMonth} onChange={e => {setSelectedMonth(e.target.value); setSelectedDay('');}} className="border rounded px-2 py-1 text-sm" />
           </div>
           
           <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500">DAY:</span>
             <input type="date" value={selectedDay} onChange={e => {setSelectedDay(e.target.value); setSelectedMonth('');}} className="border rounded px-2 py-1 text-sm" />
           </div>

           <button onClick={() => window.print()} className="ml-2 bg-slate-800 text-white px-3 py-2 rounded text-sm flex items-center gap-2 hover:bg-slate-900">
             <Download size={16}/> Print / PDF ({view})
           </button>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {view === 'matrix' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto print-section">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
             <h3 className="font-bold text-gray-700">Profit Matrix (Page vs Date)</h3>
             <span className={`text-lg font-bold ${matrixData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Total Profit: {Math.round(matrixData.totalProfit).toLocaleString()} ৳</span>
          </div>
          <table className="w-full text-sm text-right">
            <thead className="bg-white text-gray-600 uppercase text-xs border-b">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-white border-r">Page Name</th>
                {matrixData.dates.map(date => <th key={date} className="px-4 py-3 min-w-[100px]">{date}</th>)}
                <th className="px-4 py-3 bg-yellow-50 border-l">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.pages.map(page => {
                 let pageTotal = 0;
                 return (
                   <tr key={page} className="border-b hover:bg-gray-50">
                     <td className="px-4 py-3 text-left font-bold sticky left-0 bg-white border-r">{page}</td>
                     {matrixData.rows.map(row => {
                       const val = row[page] || 0;
                       pageTotal += val;
                       return (
                         <td key={row.date} className={`px-4 py-3 ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-300'}`}>
                           {val !== 0 ? val.toLocaleString() : '-'}
                         </td>
                       );
                     })}
                     <td className={`px-4 py-3 font-bold bg-yellow-50 border-l ${pageTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{pageTotal.toLocaleString()}</td>
                   </tr>
                 );
              })}
              {/* Daily Totals Row */}
              <tr className="bg-yellow-50 font-bold border-t-2 border-yellow-200">
                <td className="px-4 py-3 text-left sticky left-0 bg-yellow-50 border-r">Total</td>
                {matrixData.rows.map(row => (
                  <td key={row.date} className={`px-4 py-3 ${row.total >= 0 ? 'text-green-700' : 'text-red-700'}`}>{Math.round(row.total).toLocaleString()}</td>
                ))}
                <td className={`px-4 py-3 border-l ${matrixData.totalProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>{Math.round(matrixData.totalProfit).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* CATEGORY VIEW */}
      {view === 'category' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print-section">
           <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Category Breakdown (Financials)</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-sm">
               <thead className="bg-blue-50 text-blue-900 uppercase text-xs">
                 <tr>
                   <th className="px-6 py-3 text-left">Description</th>
                   <th className="px-6 py-3 text-right">Calculation</th>
                   <th className="px-6 py-3 text-right font-bold bg-yellow-50">AMOUNT (৳)</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {[
                   { label: 'Total Maler Dam', val: categoryData.malerDam },
                   { label: 'Total Dollar', val: categoryData.dollar },
                   { label: 'Total Salary', val: categoryData.totalSalaryCombined, sub: '(Page Salary + Mgmt Salary)' },
                   { label: 'Bonus', val: categoryData.bonus },
                   { label: 'Office Cost', val: categoryData.office },
                   { label: 'COD', val: categoryData.cod },
                   { label: 'Return Cost', val: categoryData.returnLoss },
                   { label: 'Delivery Charge', val: categoryData.delivery },
                   { label: 'Packing Cost', val: categoryData.packing },
                   
                   { label: 'Total Order', val: categoryData.orders, isCurrency: false, separator: true },
                   { label: 'Total Delivered Amount', val: categoryData.sales }, // Sales/Revenue
                   
                   { label: 'NET PROFIT', val: categoryData.netProfit, bold: true, color: true, separator: true },
                   
                   { label: 'Total Return Tk.', val: categoryData.returnLoss } // As requested
                 ].map((item, i) => (
                   <tr key={i} className={`hover:bg-gray-50 ${item.bold ? 'font-bold bg-gray-50' : ''} ${item.separator ? 'border-t-2 border-gray-200' : ''}`}>
                     <td className="px-6 py-3">
                        <span className="uppercase text-gray-600 font-semibold">{item.label}</span>
                        {item.sub && <span className="text-xs text-gray-400 ml-2 block">{item.sub}</span>}
                     </td>
                     <td className="px-6 py-3 text-right text-gray-400 text-xs">-</td>
                     <td className={`px-6 py-3 text-right bg-yellow-50 ${item.color ? (item.val >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-800'}`}>
                        {item.isCurrency !== false ? item.val.toLocaleString(undefined, {minimumFractionDigits: 0}) : item.val}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* DETAILED DAILY VIEW */}
      {view === 'detailed' && (
        <div className="space-y-4 print-section">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-700">Detailed Daily Breakdown</h3>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-sm">
               <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                 <tr>
                   <th className="px-6 py-3 text-left w-48">Date</th>
                   <th className="px-6 py-3 text-center">Page Breakdown (Orders / Ad$ / Profit)</th>
                   <th className="px-6 py-3 text-right w-48 font-bold text-gray-800">Daily Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {detailedDaily.map((day) => (
                   <tr key={day.date} className="hover:bg-gray-50">
                     <td className="px-6 py-4 font-mono font-medium">{day.date}</td>
                     <td className="px-6 py-4">
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {day.pages.map(p => (
                            <div key={p.name} className="flex flex-col p-2 bg-blue-50 rounded border border-blue-100 text-xs">
                               <span className="font-bold text-blue-800 mb-1">{p.name}</span>
                               <div className="flex justify-between text-gray-500">
                                 <span>Ord: {p.orders}</span>
                                 <span>Ad: ${Math.round(p.ad)}</span>
                               </div>
                               <div className={`text-right font-bold mt-1 ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {Math.round(p.profit).toLocaleString()}
                               </div>
                            </div>
                          ))}
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="text-xs text-gray-500 mb-1">{day.totalOrders} Orders</div>
                       <div className={`text-lg font-bold ${day.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         {Math.round(day.totalProfit).toLocaleString()} ৳
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryReport;
    