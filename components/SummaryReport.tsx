import React, { useMemo, useState } from 'react';
import { getAnalysisData } from '../services/storage';

const SummaryReport: React.FC = () => {
  const [view, setView] = useState<'matrix' | 'category'>('matrix');
  const analysisData = getAnalysisData();

  const matrixData = useMemo(() => {
    // Rows: Dates, Cols: Pages
    const dates = analysisData.map(d => d.date).sort().reverse();
    
    // Get unique pages from all history
    const pagesSet = new Set<string>();
    analysisData.forEach(d => d.rows.forEach(r => pagesSet.add(r.pageName)));
    const pages = Array.from(pagesSet).sort();
    
    const data: any[] = [];

    dates.forEach(date => {
      const dayData = analysisData.find(d => d.date === date);
      if (dayData) {
        const row: any = { date };
        pages.forEach(page => {
          const pageRow = dayData.rows.find(r => r.pageName === page);
          // Use calculated profit if exists
          row[page] = pageRow ? Math.round(pageRow.calculatedNetProfit || 0) : 0;
        });
        data.push(row);
      }
    });

    return { dates, pages, data };
  }, [analysisData]);

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
                        {val !== 0 ? `৳${val.toLocaleString()}` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
           Select Matrix View to see daily profit breakdown.
        </div>
      )}
    </div>
  );
};

export default SummaryReport;