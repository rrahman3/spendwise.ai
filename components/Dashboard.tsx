
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getMonthIndex = (monthName: string) => {
    const idx = MONTH_NAMES.indexOf(monthName);
    return idx >= 0 ? idx : 0;
};

// --- Chart Components ---
const ChartWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[320px] flex flex-col">
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

const ChartSelector: React.FC<{ value: ChartView; onChange: (v: ChartView) => void }> = ({ value, onChange }) => {
    const options: { key: ChartView; label: string }[] = [
        { key: 'trend', label: 'Trend' },
        { key: 'stores', label: 'By Store' },
        { key: 'categories', label: 'By Category' },
        { key: 'months', label: 'By Month' },
    ];
    return (
        <div className="inline-flex bg-gray-100 rounded-full p-1 text-sm font-semibold">
            {options.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={`px-3 py-1 rounded-full ${value === opt.key ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
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
    const monthIndex = getMonthIndex(selectedMonth);
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
    const monthSpend = new Map<string, number>();
    const weekdaySpend = new Map<string, number>();
    const weekdayOrder = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    filtered.forEach(r => {
        const store = r.storeName?.trim().toUpperCase() || 'UNKNOWN';
        merchantSpend.set(store, (merchantSpend.get(store) || 0) + r.total);

        r.items?.forEach(item => {
            const category = item.category?.trim().toUpperCase() || 'UNCATEGORIZED';
            categorySpend.set(category, (categorySpend.get(category) || 0) + item.price);
        });

        const date = new Date(r.date);
        const weekday = weekdayOrder[date.getDay()];
        weekdaySpend.set(weekday, (weekdaySpend.get(weekday) || 0) + r.total);
        if (periodView === 'monthly') {
            const day = date.getDate().toString();
            spendingTrendData.set(day, (spendingTrendData.get(day) || 0) + r.total);
        } else {
            const monthName = date.toLocaleString('default', { month: 'short' });
            spendingTrendData.set(monthName, (spendingTrendData.get(monthName) || 0) + r.total);
        }
        const monthName = date.toLocaleString('default', { month: 'short' });
        monthSpend.set(monthName, (monthSpend.get(monthName) || 0) + r.total);
    });

    const topMerchants = Array.from(merchantSpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const topCategories = Array.from(categorySpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const spendByStore = Array.from(merchantSpend.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, spend]) => ({ name, spend }));

    let formattedSpendingTrend;
    if (periodView === 'yearly') {
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

    const spendByMonth = monthOrder.map(month => ({ name: month, spend: monthSpend.get(month) || 0 }));
    const spendByWeekday = weekdayOrder.map(day => ({ name: day, spend: weekdaySpend.get(day) || 0 }));
    const avgTicket = filtered.length ? totalSpend / filtered.length : 0;
    const uniqueStores = merchantSpend.size;
    const receiptCount = filtered.length;

    return { totalSpend, topMerchants, topCategories, filteredReceipts: filtered, spendingTrend: formattedSpendingTrend, dailyAvg, spendByStore, spendByMonth, spendByWeekday, avgTicket, uniqueStores, receiptCount };
};


// --- Main Dashboard Component ---
interface DashboardProps {
    receipts: Receipt[];
    onScanClick?: () => void;
}

type ChartView = 'trend' | 'stores' | 'categories' | 'months';
type SortKey = 'store' | 'date' | 'total';

const Dashboard: React.FC<DashboardProps> = ({ receipts, onScanClick }) => {
    const [periodView, setPeriodView] = useState<'monthly' | 'yearly'>('monthly');
    const [chartView, setChartView] = useState<ChartView>('trend');
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
            availableMonths: MONTH_NAMES,
            mostRecentYear: mostRecentDate.getFullYear(),
            mostRecentMonth: mostRecentDate.toLocaleString('default', { month: 'long' })
        };
    }, [receipts]);

    const [selectedYear, setSelectedYear] = useState(mostRecentYear);
    const [selectedMonth, setSelectedMonth] = useState(mostRecentMonth);
    const stepPeriod = (direction: 1 | -1) => {
        if (periodView === 'yearly') {
            setSelectedYear((y) => y + direction);
            return;
        }
        const current = new Date(selectedYear, getMonthIndex(selectedMonth), 1);
        current.setMonth(current.getMonth() + direction);
        setSelectedYear(current.getFullYear());
        setSelectedMonth(MONTH_NAMES[current.getMonth()]);
    };

    const { totalSpend, topMerchants, topCategories, filteredReceipts, spendingTrend, dailyAvg, spendByStore, spendByMonth, spendByWeekday, avgTicket, uniqueStores, receiptCount } = 
        processReceiptData(receipts, periodView, selectedYear, selectedMonth);

    const { prevYear, prevMonth } = useMemo(() => {
        if (periodView === 'yearly') {
            return { prevYear: selectedYear - 1, prevMonth: selectedMonth };
        }
        const current = new Date(selectedYear, getMonthIndex(selectedMonth), 1);
        current.setMonth(current.getMonth() - 1);
        return { prevYear: current.getFullYear(), prevMonth: MONTH_NAMES[current.getMonth()] };
    }, [selectedMonth, selectedYear, periodView]);

    const { totalSpend: prevTotalSpend } = useMemo(
        () => processReceiptData(receipts, periodView, prevYear, prevMonth),
        [receipts, periodView, prevYear, prevMonth]
    );

    const spendDelta = prevTotalSpend > 0 ? ((totalSpend - prevTotalSpend) / prevTotalSpend) * 100 : null;
    const topStore = topMerchants[0]?.name ?? '—';
    const topCategory = topCategories[0]?.name ?? '—';

    const bannerTitle = periodView === 'monthly' ? `${selectedMonth} ${selectedYear}` : `${selectedYear}`;

    const sortedReceipts = useMemo(() => {
        const sorted = [...filteredReceipts].sort((a, b) => {
            if (sortKey === 'store') {
                return sortDir === 'asc'
                    ? a.storeName.localeCompare(b.storeName)
                    : b.storeName.localeCompare(a.storeName);
            }
            if (sortKey === 'total') {
                return sortDir === 'asc' ? a.total - b.total : b.total - a.total;
            }
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return sortDir === 'asc' ? da - db : db - da;
        });
        return sorted.slice(0, 20);
    }, [filteredReceipts, sortDir, sortKey]);

    const chartTitleMap: Record<ChartView, string> = {
        trend: 'Spending Trend',
        stores: 'Spending by Store',
        categories: 'Category Breakdown',
        months: 'Spending by Month',
    };

    const chartContent = () => {
        switch (chartView) {
            case 'stores':
                return <SpendingChart data={spendByStore} />;
            case 'categories':
                return <CategoryChart data={topCategories} />;
            case 'months':
                return <SpendingChart data={spendByMonth} />;
            default:
                return <SpendingChart data={spendingTrend} />;
        }
    };

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
            <div className="bg-gradient-to-br from-[#0F172A] via-[#0EA5E9] to-[#14B8A6] rounded-3xl p-8 text-white shadow-lg flex flex-wrap justify-between items-start gap-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <p className="text-blue-100 text-sm uppercase tracking-[0.2em]">Total spend</p>
                        <div className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">
                            {bannerTitle}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-5xl font-extrabold">{`$${totalSpend.toFixed(2)}`}</h2>
                        <div className="px-3 py-2 rounded-full bg-white/10 text-sm font-semibold flex items-center gap-2">
                            <span className="text-blue-50">vs prev</span>
                            <span className={spendDelta !== null ? (spendDelta >= 0 ? "text-green-100" : "text-red-100") : "text-blue-50"}>
                                {prevTotalSpend > 0 ? `${spendDelta!.toFixed(1)}%` : "—"}
                            </span>
                        </div>
                    </div>
                    <p className="text-blue-100 max-w-md">{filteredReceipts.length} receipts analyzed for this period.</p>
                    <div className="flex flex-wrap gap-3">
                        <div className="px-3 py-2 rounded-2xl bg-white/15 text-sm font-semibold backdrop-blur">
                            Daily avg: ${dailyAvg.toFixed(2)}
                        </div>
                        <div className="px-3 py-2 rounded-2xl bg-white/15 text-sm font-semibold backdrop-blur">
                            Top store: {topStore}
                        </div>
                        <div className="px-3 py-2 rounded-2xl bg-white/15 text-sm font-semibold backdrop-blur">
                            Top category: {topCategory}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => stepPeriod(-1)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition"
                            title="Previous period"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => stepPeriod(1)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition"
                            title="Next period"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-medium">Previous: ${prevTotalSpend.toFixed(2)}</p>
                        <p className="text-sm text-blue-100">Auto-compare period</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">Receipts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{receiptCount}</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">Average Ticket</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${avgTicket.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">Unique Stores</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueStores}</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500">Top Category</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{topCategories[0]?.name || '—'}</p>
                </div>
            </div>

            {/* Main Charts & Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <ChartSelector value={chartView} onChange={setChartView} />
                    </div>
                    <ChartWrapper title={chartTitleMap[chartView]}>
                        {chartContent()}
                    </ChartWrapper>
                </div>
                <div className="lg:col-span-1 space-y-6">
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800">Receipts (sorted)</h4>
                            <div className="flex items-center gap-2 text-xs">
                                {(['date','store','total'] as SortKey[]).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setSortKey(key)}
                                        className={`px-2 py-1 rounded ${sortKey === key ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                                    >
                                        {key}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                                    className="px-2 py-1 rounded text-gray-600"
                                    title="Toggle sort direction"
                                >
                                    {sortDir === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
                            {sortedReceipts.length === 0 && (
                                <div className="py-4 text-sm text-gray-500 text-center">No receipts</div>
                            )}
                            {sortedReceipts.map(r => (
                                <div key={r.id} className="py-3 flex justify-between text-sm">
                                    <div>
                                        <div className="font-semibold text-gray-800">{r.storeName}</div>
                                        <div className="text-gray-500 text-xs">{r.date}</div>
                                    </div>
                                    <div className="text-gray-900 font-bold">{`$${r.total.toFixed(2)}`}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChartWrapper title="Spend by Weekday">
                    <SpendingChart data={spendByWeekday} />
                </ChartWrapper>
                <ChartWrapper title="Category Mix">
                    <CategoryChart data={topCategories} />
                </ChartWrapper>
            </div>
        </div>
    );
};

export default Dashboard;
