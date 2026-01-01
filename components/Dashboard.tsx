
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Receipt } from '../types';

interface DashboardProps {
  receipts: Receipt[];
  onScanClick?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ receipts, onScanClick }) => {
  const stats = useMemo(() => {
    const total = receipts.reduce((sum, r) => sum + r.total, 0);
    const lastMonth = receipts.filter(r => {
      const date = new Date(r.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, r) => sum + r.total, 0);

    const categoryDataMap: Record<string, number> = {};
    receipts.forEach(r => {
      r.items.forEach(item => {
        const cat = item.category || 'Other';
        categoryDataMap[cat] = (categoryDataMap[cat] || 0) + (item.price * item.quantity);
      });
    });

    const categoryData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

    const historyData = receipts
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10)
      .map(r => ({
        date: r.date,
        total: r.total
      }));

    return { total, lastMonth, categoryData, historyData };
  }, [receipts]);

  return (
    <div className="space-y-6">
      {/* Quick Actions / Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-black">Ready to scan?</h2>
          <p className="text-blue-100 font-medium">Capture a receipt and let Gemini do the math for you.</p>
        </div>
        <button 
          onClick={onScanClick}
          className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Scan Receipt</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Lifetime Spend</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">${stats.total.toFixed(2)}</h3>
          <div className="mt-2 text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
            Across {receipts.length} receipts
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Spending This Month</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">${stats.lastMonth.toFixed(2)}</h3>
          <p className="mt-2 text-xs text-gray-400">Updates in real-time</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Average per Receipt</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">
            ${receipts.length ? (stats.total / receipts.length).toFixed(2) : '0.00'}
          </h3>
          <p className="mt-2 text-xs text-gray-400">Based on all scans</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
          <h4 className="text-lg font-semibold mb-6">Spending by Category</h4>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={stats.categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs font-medium">
            {stats.categoryData.map((d, i) => (
              <div key={d.name} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
          <h4 className="text-lg font-semibold mb-6">Recent Spending Trend</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={stats.historyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" />
              <YAxis fontSize={10} stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
