import React, { useMemo, useState } from 'react';
import { getOrders, calculateNetProfit } from '../services/storage';

const SummaryReport: React.FC = () => {
  const [view, setView] = useState<'matrix' | 'category'>('matrix');
  const orders = getOrders();

  const matrixData = useMemo(() => {
    // Rows: Dates, Cols: Pages
    const dates = Array.from(new Set(orders.map(o => o.date))).sort().reverse();
    const pages = Array.from(new Set(orders.map(o => o.pageName))).sort();
    
    const data: any[] = [];

    dates.forEach(date => {
      const row: any = { date };
      pages.forEach(page => {
        const relevantOrders = orders.filter(o => o.date === date && o.pageName === page);
        const profit = relevantOrders.reduce((acc, o) => acc + calculateNetProfit(o), 0);
        row[page] = profit;
      });
      data.push(row);
    });

    return { dates, pages, data };
  }, [orders]);

  const categoryData = useMemo(() => {
    const breakdown = {
      purchase: 0,
      ad: 0,
      packaging: 0,
      delivery: 0,
      management: 0,
      sales: 0,
      netProfit: 0
    };

    orders.forEach(o => {
      breakdown.purchase += o.purchaseCost;
      breakdown.ad += o.adCost;
      breakdown.packaging += o.packagingCost;
      breakdown.delivery += o.deliveryCost;
      breakdown.management += o.managementCost;
      breakdown.sales += o.salePrice;
      breakdown.netProfit += calculateNetProfit(o);
    });

    return breakdown;
  }, [orders]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Summary Reports</h2>
        <div className="bg-white p-1 rounded-lg border flex">
          <button 
            onClick={() => setView('matrix')}
            className={`px-4 py-2 rounded-md ${view === 'matrix' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'}`}
          >
            Monthly Matrix
          </button>
          <button 
             onClick={() => setView('category')}
             className={`px-4 py-2 rounded-md ${view === 'category' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'}`}
          >
            Category Breakdown
          </button>
        </div>
      </div>

      {view === 'matrix' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 border-r">Date</th>
                {matrixData.pages.map(page => (
                  <th key={page} className="px-4 py-3 min-w-[120px]">{page}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.data.map((row) => (
                <tr key={row.date} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-left font-medium sticky left-0 bg-white border-r">{row.date}</td>
                  {matrixData.pages.map(page => {
                    const val = row[page];
                    return (
                      <td key={page} className={`px-4 py-3 ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {val !== 0 ? `৳${val}` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-green-500">
             <h3 className="text-gray-500 font-medium uppercase tracking-wider text-xs">Total Revenue</h3>
             <p className="text-3xl font-bold text-gray-800 mt-2">৳ {categoryData.sales.toLocaleString()}</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-blue-500">
             <h3 className="text-gray-500 font-medium uppercase tracking-wider text-xs">Net Profit</h3>
             <p className={`text-3xl font-bold mt-2 ${categoryData.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
               ৳ {categoryData.netProfit.toLocaleString()}
             </p>
           </div>
           
           <div className="bg-white p-6 rounded-xl shadow-sm border col-span-1 md:col-span-2 lg:col-span-3">
             <h3 className="font-bold text-lg mb-4">Expense Breakdown</h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                 <span>Product Purchase Cost</span>
                 <span className="font-semibold">৳ {categoryData.purchase.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                 <span>Ad Spend</span>
                 <span className="font-semibold">৳ {categoryData.ad.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                 <span>Courier/Delivery</span>
                 <span className="font-semibold">৳ {categoryData.delivery.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                 <span>Packaging</span>
                 <span className="font-semibold">৳ {categoryData.packaging.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                 <span>Management/Salary</span>
                 <span className="font-semibold">৳ {categoryData.management.toLocaleString()}</span>
               </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SummaryReport;