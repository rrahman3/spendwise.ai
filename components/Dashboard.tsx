
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// --- Chart Components ---
const ChartWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[300px] flex flex-col">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <div className="flex-grow mt-4">
            {children}
        </div>
    </div>
);

const SpendingChart: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB' }} />
            <Bar dataKey="spend" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

const CategoryChart: React.FC<{ data: any[] }> = ({ data }) => {
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
};


// --- Helper Components ---
const PeriodToggle: React.FC<{ view: 'monthly' | 'yearly'; setView: (view: 'monthly' | 'yearly') => void }> = ({ view, setView }) => (
    <div className="flex items-center bg-gray-200 rounded-full p-1">
        <button onClick={() => setView('monthly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${view === 'monthly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'}`}>
            Monthly
        </button>
        <button onClick={() => setView('yearly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${view === 'yearly' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'}`}>
            Yearly
        </button>
    </div>
);

const DatePicker: React.FC<{
    periodView: 'monthly' | 'yearly';
    availableYears: number[];
    availableMonths: string[];
    selectedYear: number;
    selectedMonth: string;
    onYearChange: (year: number) => void;
    onMonthChange: (month: string) => void;
}> = ({ periodView, availableYears, availableMonths, selectedYear, selectedMonth, onYearChange, onMonthChange }) => (
    <div className="flex items-center space-x-2">
        {periodView === 'monthly' && (
            <select 
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-white border border-gray-300 rounded-full text-sm font-medium py-2 px-4 appearance-none"
            >
                {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
        )}
        <select 
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="bg-white border border-gray-300 rounded-full text-sm font-medium py-2 px-4 appearance-none"
        >
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
    </div>
);

// --- Data Processing Utilities ---
const processReceiptData = (receipts: Receipt[], periodView: 'monthly' | 'yearly', selectedYear: number, selectedMonth: string) => {
    const monthIndex = new Date(Date.parse(selectedMonth +" 1, 2012")).getMonth();
    const filtered = receipts.filter(r => {
        const date = new Date(r.date);
        if (isNaN(date.getTime())) return false;
        const yearMatches = date.getFullYear() === selectedYear;
        const monthMatches = date.getMonth() === monthIndex;
        return periodView === 'yearly' ? yearMatches : (yearMatches && monthMatches);
    });

    const totalSpend = filtered.reduce((sum, r) => sum + r.total, 0);
    const merchantSpend = new Map<string, number>();
    const categorySpend = new Map<string, number>();
    const spendingTrendData = new Map<string, number>();

    filtered.forEach(r => {
        const store = r.storeName?.trim().toUpperCase() || 'UNKNOWN';
        merchantSpend.set(store, (merchantSpend.get(store) || 0) + r.total);

        r.items?.forEach(item => {
            const category = item.category?.trim().toUpperCase() || 'UNCATEGORIZED';
            categorySpend.set(category, (categorySpend.get(category) || 0) + item.price);
        });

        const date = new Date(r.date);
        if (periodView === 'monthly') {
            const day = date.getDate().toString();
            spendingTrendData.set(day, (spendingTrendData.get(day) || 0) + r.total);
        } else {
            const monthName = date.toLocaleString('default', { month: 'short' });
            spendingTrendData.set(monthName, (spendingTrendData.get(monthName) || 0) + r.total);
        }
    });

    const topMerchants = Array.from(merchantSpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const topCategories = Array.from(categorySpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    let formattedSpendingTrend;
    if (periodView === 'yearly') {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        formattedSpendingTrend = monthOrder.map(month => ({
            name: month,
            spend: spendingTrendData.get(month) || 0
        }));
    } else {
        const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
        formattedSpendingTrend = Array.from({ length: daysInMonth }, (_, i) => {
            const day = (i + 1).toString();
            return {
                name: day,
                spend: spendingTrendData.get(day) || 0
            }
        });
    }

    const daysWithSpend = new Set(filtered.map(r => new Date(r.date).toDateString())).size;
    const dailyAvg = daysWithSpend > 0 ? totalSpend / daysWithSpend : 0;

    return { totalSpend, topMerchants, topCategories, filteredReceipts: filtered, spendingTrend: formattedSpendingTrend, dailyAvg };
};


// --- Main Dashboard Component ---
interface DashboardProps {
    receipts: Receipt[];
    onScanClick?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ receipts, onScanClick }) => {
    const [periodView, setPeriodView] = useState<'monthly' | 'yearly'>('monthly');

    const { availableYears, availableMonths, mostRecentYear, mostRecentMonth } = useMemo(() => {
        if (receipts.length === 0) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().toLocaleString('default', { month: 'long' });
            return { availableYears: [currentYear], availableMonths: [currentMonth], mostRecentYear: currentYear, mostRecentMonth: currentMonth };
        }

        const yearSet = new Set<number>();
        let mostRecentDate = new Date(0);
        receipts.forEach(r => {
            try {
                const date = new Date(r.date);
                if (!isNaN(date.getTime())) {
                    yearSet.add(date.getFullYear());
                    if (date > mostRecentDate) mostRecentDate = date;
                }
            } catch(e) {}
        });

        const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
        return {
            availableYears: sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()],
            availableMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            mostRecentYear: mostRecentDate.getFullYear(),
            mostRecentMonth: mostRecentDate.toLocaleString('default', { month: 'long' })
        };
    }, [receipts]);

    const [selectedYear, setSelectedYear] = useState(mostRecentYear);
    const [selectedMonth, setSelectedMonth] = useState(mostRecentMonth);

    const { totalSpend, topMerchants, topCategories, filteredReceipts, spendingTrend, dailyAvg } = 
        processReceiptData(receipts, periodView, selectedYear, selectedMonth);

    const bannerTitle = periodView === 'monthly' ? `${selectedMonth} ${selectedYear}` : `${selectedYear}`;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="flex items-center gap-4">
                    <PeriodToggle view={periodView} setView={setPeriodView} />
                    <DatePicker 
                        periodView={periodView}
                        availableYears={availableYears}
                        availableMonths={availableMonths}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        onYearChange={setSelectedYear}
                        onMonthChange={setSelectedMonth}
                    />
                </div>
            </div>

            {/* Summary Banner */}
            <div className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-3xl p-8 text-white shadow-lg flex justify-between items-start">
                <div>
                    <p className="text-blue-200 text-lg">Total Spend for {bannerTitle}</p>
                    <h2 className="text-5xl font-bold mt-2">{`$${totalSpend.toFixed(2)}`}</h2>
                    <p className="text-blue-200 mt-4 max-w-md">{filteredReceipts.length} receipts analyzed for this period.</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-medium">Daily Average</p>
                    <p className="text-3xl font-bold">{`$${dailyAvg.toFixed(2)}`}</p>
                </div>
            </div>

            {/* Main Charts & Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ChartWrapper title="Spending Trend">
                         <SpendingChart data={spendingTrend} />
                    </ChartWrapper>
                </div>
                <div className="lg:col-span-1">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="font-semibold text-gray-800">Top Merchants</h4>
                        {topMerchants.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                {topMerchants.map(({ name, value }) => (
                                    <div key={name} className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">{name}</span>
                                        <span className="text-sm font-bold text-gray-900">{`$${value.toFixed(2)}`}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="mt-4 text-center text-gray-400">No merchant data</div>}
                    </div>
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ChartWrapper title="Category Breakdown">
                        <CategoryChart data={topCategories} />
                    </ChartWrapper>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
