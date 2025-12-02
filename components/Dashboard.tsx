
import React, { useMemo } from 'react';
import { getAnalysisData } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, CheckCircle, XCircle, TrendingUp, AlertOctagon } from 'lucide-react';

const Dashboard: React.FC = () => {
  const analysisData = getAnalysisData();

  const stats = useMemo(() => {
    let totalProfit = 0;
    
    // Delivered Stats
    let deliveredCount = 0;
    let deliveredValue = 0;

    // Returned Stats
    let returnedCount = 0;
    let returnedValue = 0; // Sales value of returned items

    let operationalReturnLoss = 0; // Actual cost lost

    analysisData.forEach(day => {
       day.rows.forEach(row => {
          const tOrders = Number(row.totalOrders);
          const salePrice = Number(row.salePrice);
          const rPercent = Number(row.returnPercent);
          
          // Count
          const rCount = Math.round((tOrders * rPercent) / 100);
          const dCount = tOrders - rCount;

          // Value
          deliveredCount += dCount;
          deliveredValue += (dCount * salePrice);

          returnedCount += rCount;
          returnedValue += (rCount * salePrice);

          // Profit & Loss
          totalProfit += (row.calculatedNetProfit || 0);
          operationalReturnLoss += (row.calculatedReturnLoss || 0);
       });
    });

    return { 
      totalProfit, 
      deliveredCount, 
      deliveredValue, 
      returnedCount, 
      returnedValue, 
      operationalReturnLoss 
    };
  }, [analysisData]);

  // Chart Data Preparation
  const dailyData = useMemo(() => {
    return analysisData.map(day => ({
      date: day.date,
      profit: day.rows.reduce((s,r) => s + (r.calculatedNetProfit||0), 0),
      orders: day.rows.reduce((s,r) => s + r.totalOrders, 0)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analysisData]);

  const pageData = useMemo(() => {
    const map = new Map();
    analysisData.forEach(day => {
      day.rows.forEach(row => {
        if (!map.has(row.pageName)) map.set(row.pageName, { name: row.pageName, profit: 0 });
        map.get(row.pageName).profit += (row.calculatedNetProfit || 0);
      });
    });
    return Array.from(map.values());
  }, [analysisData]);

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Business Overview</h2>
      <p className="text-gray-500">Data source: Profit Analysis Sheets</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* 1. Net Profit */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <DollarSign size={64} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Total Net Profit</p>
            <h3 className={`text-2xl font-bold mt-2 ${stats.totalProfit >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
              ৳ {Math.round(stats.totalProfit).toLocaleString()}
            </h3>
          </div>
          <div className="mt-4 text-xs text-green-600 bg-green-50 px-2 py-1 rounded w-max">
            Actual Profit after Expenses
          </div>
        </div>

        {/* 2. Delivered (Count & Value) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <CheckCircle size={64} className="text-green-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Delivered Success</p>
            <div className="flex items-end gap-2 mt-2">
               <h3 className="text-2xl font-bold text-gray-800">{stats.deliveredCount} <span className="text-sm font-normal text-gray-400">Pich</span></h3>
            </div>
            <div className="text-lg font-bold text-green-700 mt-1">
               ৳ {Math.round(stats.deliveredValue).toLocaleString()}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Total Delivered Value</div>
        </div>

        {/* 3. Returned (Count & Value) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <XCircle size={64} className="text-orange-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Returned / Cancelled</p>
            <div className="flex items-end gap-2 mt-2">
               <h3 className="text-2xl font-bold text-gray-800">{stats.returnedCount} <span className="text-sm font-normal text-gray-400">Pich</span></h3>
            </div>
            <div className="text-lg font-bold text-orange-600 mt-1">
               ৳ {Math.round(stats.returnedValue).toLocaleString()}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Total Returned Sales Value</div>
        </div>

        {/* 4. Return Loss (Expense) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <AlertOctagon size={64} className="text-red-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase">Operational Return Loss</p>
            <h3 className="text-2xl font-bold text-red-600 mt-2">
              -৳ {Math.round(stats.operationalReturnLoss).toLocaleString()}
            </h3>
          </div>
          <div className="mt-4 text-xs text-red-600 bg-red-50 px-2 py-1 rounded w-max">
            Lost on Courier, Ad & Pack
          </div>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Daily Profit Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `৳ ${Math.round(Number(value)).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Profit by Page</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `৳ ${Math.round(Number(value)).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="profit" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
    