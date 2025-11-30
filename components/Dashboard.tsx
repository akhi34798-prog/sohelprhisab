import React, { useMemo } from 'react';
import { getOrders, calculateNetProfit } from '../services/storage';
import { OrderStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Package, RotateCcw, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const orders = getOrders();

  const stats = useMemo(() => {
    let totalProfit = 0;
    let totalOrders = orders.length;
    let delivered = 0;
    let returned = 0;
    let returnLoss = 0;

    orders.forEach(order => {
      const profit = calculateNetProfit(order);
      totalProfit += profit;
      
      if (order.status === OrderStatus.DELIVERED) delivered++;
      if (order.status === OrderStatus.RETURNED) {
        returned++;
        returnLoss += Math.abs(profit); // Profit is negative for returns, so abs for loss amount
      }
    });

    return { totalProfit, totalOrders, delivered, returned, returnLoss };
  }, [orders]);

  // Chart Data Preparation
  const dailyData = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      const profit = calculateNetProfit(order);
      if (!map.has(order.date)) map.set(order.date, { date: order.date, profit: 0, orders: 0 });
      const entry = map.get(order.date);
      entry.profit += profit;
      entry.orders += 1;
    });
    // Sort by date
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders]);

  const pageData = useMemo(() => {
    const map = new Map();
    orders.forEach(order => {
      if (!map.has(order.pageName)) map.set(order.pageName, { name: order.pageName, profit: 0 });
      map.get(order.pageName).profit += calculateNetProfit(order);
    });
    return Array.from(map.values());
  }, [orders]);

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Business Overview</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-green-100 rounded-full text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Net Profit</p>
            <h3 className="text-2xl font-bold text-gray-800">৳ {stats.totalProfit.toLocaleString()}</h3>
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
          <div className="p-4 bg-red-100 rounded-full text-red-600">
            <RotateCcw size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Returns</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.returned}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-4 bg-orange-100 rounded-full text-orange-600">
            <TrendingUp size={24} className="transform rotate-180" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Return Loss</p>
            <h3 className="text-2xl font-bold text-red-600">-৳ {stats.returnLoss.toLocaleString()}</h3>
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
                <Tooltip formatter={(value) => `৳ ${value}`} />
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
                <Tooltip formatter={(value) => `৳ ${value}`} />
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