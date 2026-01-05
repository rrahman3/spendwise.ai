import React, { useMemo, useState } from "react";
import { Receipt } from "../types";

interface StoresViewProps {
    receipts: Receipt[];
    onEditReceipt: (receipt: Receipt) => void;
    onDeleteReceipt?: (receiptId: string) => void;
}

type StoreSummary = {
    storeName: string;
    totalSpend: number;
    receiptCount: number;
    itemCount: number;
};

type ItemAggregate = {
    name: string;
    quantity: number;
    spend: number;
    category?: string;
    receipts: { id: string; date: string; total: number }[];
};

const currency = (v: number) => `$${v.toFixed(2)}`;

const StoresView: React.FC<StoresViewProps> = ({ receipts, onEditReceipt, onDeleteReceipt }) => {
    const summaries = useMemo<StoreSummary[]>(() => {
        const map = new Map<string, StoreSummary>();
        receipts.forEach((r) => {
            const key = r.storeName?.trim() || "Unknown Store";
            if (!map.has(key)) {
                map.set(key, { storeName: key, totalSpend: 0, receiptCount: 0, itemCount: 0 });
            }
            const entry = map.get(key)!;
            entry.totalSpend += r.total;
            entry.receiptCount += 1;
            entry.itemCount += r.items.reduce((sum, i) => sum + i.quantity, 0);
        });
        return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
    }, [receipts]);

    const [selectedStore, setSelectedStore] = useState<string | null>(summaries[0]?.storeName ?? null);
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

    const selectedReceipts = useMemo(
        () =>
            selectedStore
                ? receipts
                      .filter((r) => (r.storeName?.trim() || "Unknown Store") === selectedStore)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [],
        [receipts, selectedStore]
    );

    const receiptById = useMemo(() => {
        const map = new Map<string, Receipt>();
        receipts.forEach((r) => map.set(r.id, r));
        return map;
    }, [receipts]);

    const aggregatedItems = useMemo<ItemAggregate[]>(() => {
        const map = new Map<string, ItemAggregate>();
        selectedReceipts.forEach((r) => {
            r.items.forEach((i) => {
                const key = i.name.toLowerCase();
                const existing = map.get(key);
                if (existing) {
                    existing.quantity += i.quantity;
                    existing.spend += i.price * i.quantity;
                    existing.receipts.push({ id: r.id, date: r.date, total: r.total });
                } else {
                    map.set(key, {
                        name: i.name,
                        quantity: i.quantity,
                        spend: i.price * i.quantity,
                        category: i.category,
                        receipts: [{ id: r.id, date: r.date, total: r.total }],
                    });
                }
            });
        });
        return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || b.spend - a.spend);
    }, [selectedReceipts]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Stores</h1>
                    <p className="text-gray-500">Browse spend by merchant and drill into receipts and items.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-700">All Stores</p>
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                            {summaries.length}
                        </span>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
                        {summaries.length === 0 && (
                            <div className="p-6 text-sm text-gray-500 text-center">No receipts yet.</div>
                        )}
                        {summaries.map((store) => {
                            const isActive = selectedStore === store.storeName;
                            return (
                                <button
                                    key={store.storeName}
                                    onClick={() => setSelectedStore(store.storeName)}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition ${
                                        isActive ? "bg-blue-50 border-l-4 border-blue-500" : ""
                                    }`}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900">{store.storeName}</p>
                                        <p className="text-xs text-gray-500">
                                            {store.receiptCount} receipts · {store.itemCount} items
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{currency(store.totalSpend)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {selectedStore ? (
                        <>
                            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-wrap gap-4 justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500">Store</p>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedStore}</h2>
                                </div>
                                <div className="flex gap-3">
                                    <div className="px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold">
                                        {selectedReceipts.length} receipts
                                    </div>
                                    <div className="px-4 py-3 rounded-xl bg-green-50 text-green-700 font-semibold">
                                        {currency(selectedReceipts.reduce((sum, r) => sum + r.total, 0))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Recent receipts</h3>
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto">
                                        {selectedReceipts.length === 0 && (
                                            <div className="py-4 text-sm text-gray-500 text-center">No receipts yet.</div>
                                        )}
                                        {selectedReceipts.map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() => setSelectedReceipt(r)}
                                                className="w-full text-left py-3 flex justify-between items-center hover:bg-blue-50 rounded-lg px-2 transition"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800">{r.storeName}</p>
                                                    <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-gray-900">{currency(r.total)}</p>
                                                    <span className="text-[11px] text-blue-600 font-semibold">View</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Items & counts</h3>
                                        <span className="text-xs text-gray-500">
                                            {aggregatedItems.reduce((sum, i) => sum + i.quantity, 0)} total units
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto">
                                        {aggregatedItems.length === 0 && (
                                            <div className="py-4 text-sm text-gray-500 text-center">No items yet.</div>
                                        )}
                                        {aggregatedItems.map((item) => (
                                            <div key={item.name} className="py-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {item.category ? `${item.category} · ` : ""}{item.quantity} units
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-900">{currency(item.spend)}</p>
                                                </div>
                                                {item.receipts.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {item.receipts.slice(0, 3).map((r) => (
                                                            <button
                                                                key={r.id}
                                                                onClick={() => {
                                                                    const full = receiptById.get(r.id);
                                                                    if (full) setSelectedReceipt(full);
                                                                }}
                                                                className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-100 hover:bg-blue-100 transition"
                                                            >
                                                                {new Date(r.date).toLocaleDateString()} · {currency(r.total)}
                                                            </button>
                                                        ))}
                                                        {item.receipts.length > 3 && (
                                                            <span className="text-xs text-gray-500">
                                                                +{item.receipts.length - 3} more receipt{item.receipts.length - 3 > 1 ? "s" : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-10 text-center text-gray-500">
                            Select a store to see its receipts and items.
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt modal */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedReceipt.storeName}</h3>
                                <button
                                    onClick={() => onEditReceipt(selectedReceipt)}
                                    className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                    title="Edit this record"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                {onDeleteReceipt && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Delete this receipt? This cannot be undone.")) {
                                                onDeleteReceipt(selectedReceipt.id);
                                                setSelectedReceipt(null);
                                            }
                                        }}
                                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                        title="Delete this record"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-blue-400">Total Charged</p>
                                    <p className="text-2xl font-black text-blue-600">{currency(selectedReceipt.total)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Date</p>
                                    <p className="text-sm font-bold text-gray-900">{selectedReceipt.date}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h5 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Line Items</h5>
                                <div className="bg-gray-50 rounded-2xl p-2">
                                    {selectedReceipt.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0">
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-gray-800">{item.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">{item.category || "Uncategorized"} · Qty {item.quantity}</p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">{currency(item.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedReceipt.imageUrl && (
                                <div className="pt-4">
                                    <h5 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-3">Stored Document</h5>
                                    <img src={selectedReceipt.imageUrl} alt="Receipt Scan" className="w-full rounded-2xl border border-gray-100 shadow-sm" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoresView;
