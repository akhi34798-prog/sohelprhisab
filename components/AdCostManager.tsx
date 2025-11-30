import React, { useState } from 'react';
import { getOrders, saveOrders } from '../services/storage';
import { Order } from '../types';
import { Calendar, Save } from 'lucide-react';

const AdCostManager: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // These states represent the total cost for the *day*
  const [totalAdCost, setTotalAdCost] = useState(0);
  const [totalMgmtCost, setTotalMgmtCost] = useState(0);

  const fetchDayData = () => {
    const orders = getOrders();
    const daysOrders = orders.filter(o => o.date === selectedDate);
    
    if (daysOrders.length > 0) {
      const ads = daysOrders.reduce((sum, o) => sum + o.adCost, 0);
      const mgmt = daysOrders.reduce((sum, o) => sum + o.managementCost, 0);
      setTotalAdCost(ads);
      setTotalMgmtCost(mgmt);
    } else {
      setTotalAdCost(0);
      setTotalMgmtCost(0);
    }
  };

  const updateCosts = () => {
    setLoading(true);
    const orders = getOrders();
    const daysOrders = orders.filter(o => o.date === selectedDate);
    
    if (daysOrders.length === 0) {
      alert("No orders found for this date. Cannot distribute costs.");
      setLoading(false);
      return;
    }

    const newAdPerOrder = Math.round(totalAdCost / daysOrders.length);
    const newMgmtPerOrder = Math.round(totalMgmtCost / daysOrders.length);

    const updatedOrders = orders.map(o => {
      if (o.date === selectedDate) {
        return {
          ...o,
          adCost: newAdPerOrder,
          managementCost: newMgmtPerOrder
        };
      }
      return o;
    });

    saveOrders(updatedOrders);
    setLoading(false);
    alert(`Updated ${daysOrders.length} orders for ${selectedDate}`);
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Ad & Global Cost Manager</h2>
      
      <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl border border-gray-100">
        <p className="text-gray-600 mb-6">
          Use this tool to update the total daily costs if you entered them incorrectly or if costs incurred on days with orders need adjustment. 
          This will recalculate the cost-per-order for all orders on the selected date.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <div className="flex gap-4">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
                className="flex-1 p-2 border rounded-lg"
              />
              <button 
                onClick={fetchDayData}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                Fetch Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Ad Cost (BDT)</label>
              <input 
                type="number" 
                value={totalAdCost} 
                onChange={e => setTotalAdCost(Number(e.target.value))} 
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Mgmt/Salary (BDT)</label>
              <input 
                type="number" 
                value={totalMgmtCost} 
                onChange={e => setTotalMgmtCost(Number(e.target.value))} 
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <button 
              onClick={updateCosts}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Updating...' : 'Update & Recalculate Orders'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCostManager;