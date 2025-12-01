import React, { useMemo } from 'react';
import { getAnalysisData } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Package, RotateCcw, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const analysisData = getAnalysisData();

  const stats = useMemo(() => {
    let totalProfit = 0;
    let totalOrders = 0;
    let delivered = 0;
    let returnLoss = 0;
    let totalSales = 0;

    analysisData.forEach(day => {
      if (day.summary) {
        totalProfit += day.summary.totalProfit;
        totalOrders += day.summary.totalOrders;
        delivered += day.summary.totalDelivered;
        returnLoss += day.summary.totalReturnLoss;
        totalSales += day.summary.totalSales;
      }
    });

    return { totalProfit, totalOrders, delivered, returnLoss, totalSales };
  }, [analysisData]);

  // Chart Data Preparation
  const dailyData = useMemo(() => {
    return analysisData.map(day => ({
      date: day.date,
      profit: day.summary ? day.summary.totalProfit : 0,
      orders: day.summary ? day.summary.totalOrders : 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analysisData]);

  const pageData = useMemo(() => {
    const map = new Map();
    analysisData.forEach(day => {
      day.rows.forEach(row => {
        if (!map.has(row.pageName)) map.set(row.pageName, { name: row.pageName, profit: 0 });
        // Use cached calculated profit if available, else 0
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-green-100 rounded-full text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Net Profit</p>
            <h3 className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
              ৳ {Math.round(stats.totalProfit).toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 rounded-full text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.totalOrders}</h3>
            <span className="text-xs text-green-600">Delivered: {stats.delivered}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-purple-100 rounded-full text-purple-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Sales</p>
            <h3 className="text-2xl font-bold text-gray-800">৳ {Math.round(stats.totalSales).toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-orange-100 rounded-full text-orange-600">
            <RotateCcw size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Return Loss</p>
            <h3 className="text-2xl font-bold text-red-600">-৳ {Math.round(stats.returnLoss).toLocaleString()}</h3>
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