
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';
import { applyReceiptSign, getReceiptNetTotal, normalizeTotal } from '../services/totals';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getMonthIndex = (monthName: string) => {
    const idx = MONTH_NAMES.indexOf(monthName);
    return idx >= 0 ? idx : 0;
};

// --- Chart Components ---
const ChartWrapper: React.FC<{ title: string; children: React.ReactNode; subtitle?: string }> = ({ title, children, subtitle }) => (
    <div className="bg-white/90 backdrop-blur-sm p-5 sm:p-6 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 h-[340px] sm:h-[360px] lg:h-[400px] flex flex-col min-w-0">
        <h4 className="font-semibold text-gray-800">{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        <div className="flex-grow mt-4 min-h-0">
            {children}
        </div>
    </div>
);

const StoreTick: React.FC<any> = ({ x, y, payload }) => (
    <text x={x} y={y} dy={4} textAnchor="end" fill="#4B5563" fontSize={12}>
        {String(payload?.value ?? '')}
    </text>
);

const SpendingChart: React.FC<{ data: any[]; rotateXTicks?: boolean; horizontal?: boolean; height?: number; maxHeight?: number }> = ({ data, rotateXTicks, horizontal, height, maxHeight }) => {
    const baseHeight = horizontal ? Math.max(220, (data?.length || 0) * 38) : undefined;
    const dynamicHeight = height ?? (horizontal ? baseHeight : undefined);
    const clampedHeight = maxHeight && dynamicHeight ? Math.min(dynamicHeight, maxHeight) : dynamicHeight;
    return (
        <ResponsiveContainer width="100%" height={clampedHeight ?? "100%"}>
            <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={horizontal ? { top: 10, right: 24, left: 12, bottom: 12 } : { top: 5, right: 20, left: -10, bottom: 5 }}
                barCategoryGap={horizontal ? "12%" : "16%"}
                barGap={horizontal ? 6 : 4}
            >
                {horizontal ? (
                    <>
                        <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={190}
                            tick={<StoreTick />}
                        />
                    </>
                ) : (
                    <>
                        <XAxis
                            dataKey="name"
                            stroke="#9CA3AF"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={0}
                            angle={rotateXTicks ? -60 : 0}
                            textAnchor={rotateXTicks ? "end" : "middle"}
                            height={rotateXTicks ? 80 : undefined}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    </>
                )}
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB' }} />
                <Bar dataKey="spend" fill="#3B82F6" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} barSize={horizontal ? 18 : undefined} />
            </BarChart>
        </ResponsiveContainer>
    );
};

const CategoryChart: React.FC<{ data: any[]; onSliceClick?: (name: string) => void; activeLabel?: string }> = ({ data, onSliceClick, activeLabel }) => {
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    fill="#8884d8"
                    paddingAngle={4}
                    onClick={(_, idx) => {
                        const slice = data[idx];
                        if (slice && onSliceClick) onSliceClick(slice.name);
                    }}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke={activeLabel && activeLabel === entry.name ? '#111827' : undefined}
                            strokeWidth={activeLabel && activeLabel === entry.name ? 2 : 1}
                            cursor={onSliceClick ? 'pointer' : 'default'}
                        />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Legend iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
};

const AreaTrend: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <defs>
                <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
            <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB' }} />
            <Area type="monotone" dataKey="spend" stroke="#0284c7" fill="url(#gradSpend)" strokeWidth={2.2} />
        </AreaChart>
    </ResponsiveContainer>
);

const StackedRefunds: React.FC<{ data: any[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} stackOffset="sign" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Math.abs(v)}`} />
            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', borderColor: '#E5E7EB' }} formatter={(v: number, key) => [`$${Math.abs(v).toFixed(2)}`, key === 'purchases' ? 'Purchases' : 'Refunds']} />
            <Legend />
            <Bar dataKey="purchases" stackId="a" fill="#10b981" radius={[4,4,0,0]} name="Purchases" />
            <Bar dataKey="refunds" stackId="a" fill="#ef4444" radius={[4,4,0,0]} name="Refunds" />
        </BarChart>
    </ResponsiveContainer>
);
const ChartSelector: React.FC<{ value: ChartView; onChange: (v: ChartView) => void }> = ({ value, onChange }) => {
    const options: { key: ChartView; label: string }[] = [
        { key: 'trend', label: 'Trend' },
        { key: 'stores', label: 'By Store' },
        { key: 'categories', label: 'By Category' },
        { key: 'months', label: 'By Month' },
    ];
    return (
        <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 text-sm font-semibold shadow-sm">
            {options.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => onChange(opt.key)}
                    className={`px-3 py-1 rounded-full transition ${value === opt.key ? 'bg-blue-500 text-white shadow' : 'text-gray-600 hover:text-gray-800'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};


// --- Helper Components ---
const PeriodToggle: React.FC<{ view: 'monthly' | 'yearly'; setView: (view: 'monthly' | 'yearly') => void }> = ({ view, setView }) => (
    <div className="flex items-center bg-white/15 rounded-full p-1 border border-white/20">
        <button onClick={() => setView('monthly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${view === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white'}`}>
            Monthly
        </button>
        <button onClick={() => setView('yearly')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${view === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/80 hover:text-white'}`}>
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
        {periodView === 'monthly' && (
            <select 
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-white text-gray-900 border border-gray-300 rounded-full text-sm font-medium py-2 px-4 appearance-none w-full sm:w-auto"
            >
                {availableMonths.map(month => <option key={month} value={month}>{month}</option>)}
            </select>
        )}
        <select 
            value={selectedYear}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="bg-white text-gray-900 border border-gray-300 rounded-full text-sm font-medium py-2 px-4 appearance-none w-full sm:w-auto"
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

    const totalSpend = filtered.reduce((sum, r) => sum + getReceiptNetTotal(r), 0);
    const purchasesTotal = filtered.reduce((sum, r) => sum + (r.type === 'refund' ? 0 : normalizeTotal(r.total)), 0);
    const refundsTotal = filtered.reduce((sum, r) => sum + (r.type === 'refund' ? normalizeTotal(r.total) : 0), 0);
    const merchantSpend = new Map<string, number>();
    const categorySpend = new Map<string, number>();
    const subcategorySpendByCategory = new Map<string, Map<string, number>>();
    const spendingTrendData = new Map<string, number>();
    const monthSpend = new Map<string, number>();
    const monthStack = new Map<string, { purchases: number; refunds: number }>();
    const weekdaySpend = new Map<string, number>();
    const weekdayOrder = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    filtered.forEach(r => {
        const store = r.storeName?.trim().toUpperCase() || 'UNKNOWN';
        merchantSpend.set(store, (merchantSpend.get(store) || 0) + getReceiptNetTotal(r));

        r.items?.forEach(item => {
            const category = item.category?.trim().toUpperCase() || 'UNCATEGORIZED';
            const subcategory = item.subcategory?.trim().toUpperCase() || 'GENERAL';
            const lineTotal = item.price * (item.quantity ?? 1);
            const value = applyReceiptSign(lineTotal, r.type);
            categorySpend.set(category, (categorySpend.get(category) || 0) + value);
            const subMap = subcategorySpendByCategory.get(category) || new Map<string, number>();
            subMap.set(subcategory, (subMap.get(subcategory) || 0) + value);
            subcategorySpendByCategory.set(category, subMap);
        });

        const date = new Date(r.date);
        const weekday = weekdayOrder[date.getDay()];
        weekdaySpend.set(weekday, (weekdaySpend.get(weekday) || 0) + getReceiptNetTotal(r));
        if (periodView === 'monthly') {
            const day = date.getDate().toString();
            spendingTrendData.set(day, (spendingTrendData.get(day) || 0) + getReceiptNetTotal(r));
        } else {
            const monthName = date.toLocaleString('default', { month: 'short' });
            spendingTrendData.set(monthName, (spendingTrendData.get(monthName) || 0) + getReceiptNetTotal(r));
        }
        const monthName = date.toLocaleString('default', { month: 'short' });
        monthSpend.set(monthName, (monthSpend.get(monthName) || 0) + getReceiptNetTotal(r));
        const stack = monthStack.get(monthName) || { purchases: 0, refunds: 0 };
        const magnitude = normalizeTotal(r.total);
        if (r.type === 'refund') stack.refunds += magnitude;
        else stack.purchases += magnitude;
        monthStack.set(monthName, stack);
    });

    const topMerchants = Array.from(merchantSpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const topCategories = Array.from(categorySpend.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    const subcategoryBreakdown: Record<string, { name: string; value: number }[]> = {};
    subcategorySpendByCategory.forEach((map, cat) => {
        subcategoryBreakdown[cat] = Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));
    });

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
    const spendByMonthStacked = monthOrder.map(month => {
        const stack = monthStack.get(month) || { purchases: 0, refunds: 0 };
        return { name: month, purchases: stack.purchases, refunds: -stack.refunds };
    });
    const spendByWeekday = weekdayOrder.map(day => ({ name: day, spend: weekdaySpend.get(day) || 0 }));
    const avgTicket = filtered.length ? totalSpend / filtered.length : 0;
    const uniqueStores = merchantSpend.size;
    const receiptCount = filtered.length;

    return { totalSpend, purchasesTotal, refundsTotal, topMerchants, topCategories, filteredReceipts: filtered, spendingTrend: formattedSpendingTrend, dailyAvg, spendByStore, spendByMonth, spendByMonthStacked, spendByWeekday, avgTicket, uniqueStores, receiptCount, subcategoryBreakdown };
};


// --- Main Dashboard Component ---
interface DashboardProps {
    receipts: Receipt[];
    onScanClick?: () => void;
    onReceiptOpen?: (receiptId: string) => void;
}

type ChartView = 'trend' | 'stores' | 'categories' | 'months';
type SortKey = 'store' | 'date' | 'total';

const Dashboard: React.FC<DashboardProps> = ({ receipts, onScanClick, onReceiptOpen }) => {
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

    const { totalSpend, purchasesTotal, refundsTotal, topMerchants, topCategories, filteredReceipts, spendingTrend, dailyAvg, spendByStore, spendByMonth, spendByMonthStacked, spendByWeekday, avgTicket, uniqueStores, receiptCount, subcategoryBreakdown } = 
        processReceiptData(receipts, periodView, selectedYear, selectedMonth);

    const [drillCategory, setDrillCategory] = useState<string | null>(null);
    const categoryData = drillCategory ? (subcategoryBreakdown[drillCategory.toUpperCase()] ?? []) : topCategories;

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
    const topStore = topMerchants[0]?.name ?? '-';
    const topCategory = topCategories[0]?.name ?? '-';
    const refundShare = purchasesTotal > 0 ? (refundsTotal / purchasesTotal) * 100 : 0;

    const bannerTitle = periodView === 'monthly' ? `${selectedMonth} ${selectedYear}` : `${selectedYear}`;

    const sortedReceipts = useMemo(() => {
        const sorted = [...filteredReceipts].sort((a, b) => {
            if (sortKey === 'store') {
                return sortDir === 'asc'
                    ? a.storeName.localeCompare(b.storeName)
                    : b.storeName.localeCompare(a.storeName);
            }
            if (sortKey === 'total') {
                const aTotal = normalizeTotal(a.total);
                const bTotal = normalizeTotal(b.total);
                return sortDir === 'asc' ? aTotal - bTotal : bTotal - aTotal;
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
                return (
                    <div className="h-full max-h-full min-h-0 overflow-y-auto pr-1 space-y-3">
                        {spendByStore.length === 0 && (
                            <p className="text-sm text-gray-500">No store data yet.</p>
                        )}
                        {spendByStore.map(({ name, spend }) => (
                            <div key={name} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                                <span className="text-sm font-semibold text-gray-800 truncate pr-3">{name}</span>
                                <span className={`text-sm font-bold ${spend < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {`${spend < 0 ? '-' : ''}$${Math.abs(spend).toFixed(2)}`}
                                </span>
                            </div>
                        ))}
                    </div>
                );
            case 'categories':
                return (
                    <div className="h-full relative">
                        {drillCategory && (
                            <button
                                onClick={() => setDrillCategory(null)}
                                className="absolute right-0 top-0 text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                                Back to categories
                            </button>
                        )}
                        <CategoryChart
                            data={categoryData}
                            activeLabel={drillCategory ?? undefined}
                            onSliceClick={(name) => {
                                if (chartView === 'categories' && !drillCategory) {
                                    setDrillCategory(name);
                                }
                            }}
                        />
                    </div>
                );
            case 'months':
                return <SpendingChart data={spendByMonth} />;
            default:
                return <AreaTrend data={spendingTrend} />;
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-white/80">Dashboard overview</p>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">{`$${totalSpend.toFixed(2)}`}</h1>
                            <div className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">
                                {bannerTitle}
                            </div>
                        </div>
                        <p className="text-sm text-white/80 font-medium">{filteredReceipts.length} receipts analyzed for this period.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <div className="bg-white/10 rounded-2xl p-1 shadow-sm">
                            <PeriodToggle view={periodView} setView={setPeriodView} />
                        </div>
                        <div className="bg-white/10 rounded-2xl p-1 shadow-sm">
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
                </div>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Daily avg</p>
                        <p className="text-2xl font-black">${dailyAvg.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Top store</p>
                        <p className="text-2xl font-black truncate">{topStore}</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Top category</p>
                        <p className="text-2xl font-black truncate">{topCategory}</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Refund share</p>
                        <p className="text-2xl font-black">{refundShare.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Total purchases</p>
                        <p className="text-2xl font-black">${purchasesTotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-3 shadow-sm border border-white/10">
                        <p className="text-xs font-semibold text-white/80">Total refunds</p>
                        <p className="text-2xl font-black">-${refundsTotal.toFixed(2)}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
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
                        <p className="text-sm font-semibold text-white/80">Previous period</p>
                        <p className="text-lg font-black">${prevTotalSpend.toFixed(2)}</p>
                        {prevTotalSpend > 0 && (
                            <p className="text-xs text-white/70">Change: {spendDelta !== null ? spendDelta.toFixed(1) : "0.0"}%</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile glance cards */}
            <div className="grid md:hidden grid-cols-1 gap-3">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500">Total spend</p>
                    <p className="text-xl font-black text-gray-900 mt-1">${totalSpend.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500">Receipts</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{receiptCount}</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500">Unique stores</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{uniqueStores}</p>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-gray-100 shadow-md">
                    <p className="text-xs font-semibold text-gray-500">Top Category</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{topCategories[0]?.name || 'N/A'}</p>
                </div>
            </div>


            {/* Main Charts & Lists Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4 min-w-0">
                    <div className="flex items-center justify-between overflow-x-auto">
                        <ChartSelector value={chartView} onChange={setChartView} />
                    </div>
                    <ChartWrapper title={chartTitleMap[chartView]} subtitle="Track patterns and spot outliers quickly.">
                        {chartContent()}
                    </ChartWrapper>
                    <ChartWrapper title="Refunds vs Purchases" subtitle="Stacked view shows refund drag each month.">
                        <StackedRefunds data={spendByMonthStacked} />
                    </ChartWrapper>
                </div>
                <div className="lg:col-span-1 space-y-6 min-w-0">
                     <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                        <h4 className="font-semibold text-gray-800">Top Merchants</h4>
                        {topMerchants.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                {topMerchants.map(({ name, value }) => (
                                    <div key={name} className="flex justify-between items-center gap-3 min-w-0">
                                        <span className="text-sm font-medium text-gray-700 truncate" title={name}>{name}</span>
                                        <span className="text-sm font-bold text-gray-900">{`$${value.toFixed(2)}`}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="mt-4 text-center text-gray-400">No merchant data</div>}
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                        <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                            <h4 className="font-semibold text-gray-800">Receipts</h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                {(['date','store','total'] as SortKey[]).map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setSortKey(key)}
                                        className={`px-2 py-1 rounded ${sortKey === key ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                                    >
                                        {key === 'date' ? 'Date' : key === 'store' ? 'Store' : 'Total'}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                                    className="px-2 py-1 rounded text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                    title="Toggle sort direction"
                                    aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {sortDir === 'asc' ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 15l7-7 7 7" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
                                        )}
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-64 overflow-auto">
                            {sortedReceipts.length === 0 && (
                                <div className="py-4 text-sm text-gray-500 text-center">No receipts</div>
                            )}
                            {sortedReceipts.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => onReceiptOpen?.(r.id)}
                                    className="w-full text-left py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm hover:bg-blue-50 focus:outline-none rounded-xl px-2 transition-all"
                                >
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-800 truncate">{r.storeName}</div>
                                        <div className="text-gray-500 text-xs">
                                            {r.storeLocation ? `${r.storeLocation} - ` : ''}{r.date}
                                        </div>
                                    </div>
                                    <div className="text-gray-900 font-bold sm:text-right whitespace-nowrap">{`${r.type === 'refund' ? '-' : ''}$${r.total.toFixed(2)}`}</div>
                                </button>
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
