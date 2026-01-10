import React, { useMemo, useState } from "react";
import { Receipt } from "../types";
import { applyReceiptSign, getReceiptNetTotal } from "../services/totals";

interface StoresViewProps {
    receipts: Receipt[];
    onEditReceipt: (receipt: Receipt) => void;
    onDeleteReceipt?: (receiptId: string, opts?: { skipConfirm?: boolean }) => void;
}

type StoreSummary = {
    storeName: string;
    netSpend: number;
    receiptCount: number;
    refundCount: number;
};

const currency = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;

const StoresView: React.FC<StoresViewProps> = ({ receipts, onEditReceipt, onDeleteReceipt }) => {
    const summaries = useMemo<StoreSummary[]>(() => {
        const map = new Map<string, StoreSummary>();
        receipts.forEach((r) => {
            const key = r.storeName?.trim() || "Unknown Store";
            if (!map.has(key)) {
                map.set(key, { storeName: key, netSpend: 0, receiptCount: 0, refundCount: 0 });
            }
            const entry = map.get(key)!;
            entry.netSpend += getReceiptNetTotal(r);
            entry.receiptCount += 1;
            if (r.type === "refund") entry.refundCount += 1;
        });
        return Array.from(map.values()).sort((a, b) => Math.abs(b.netSpend) - Math.abs(a.netSpend));
    }, [receipts]);

    const [selectedStore, setSelectedStore] = useState<string | null>(summaries[0]?.storeName ?? null);
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [receiptSort, setReceiptSort] = useState<"date_desc" | "total_desc" | "total_asc" | "name_asc">("date_desc");
    const [itemSort, setItemSort] = useState<"spend_desc" | "name_asc" | "qty_desc">("spend_desc");

    const selectedSummary = useMemo(
        () => summaries.find((s) => s.storeName === selectedStore) ?? null,
        [summaries, selectedStore]
    );

    const selectedReceipts = useMemo(
        () =>
            selectedStore
                ? (() => {
                      const filtered = receipts.filter((r) => (r.storeName?.trim() || "Unknown Store") === selectedStore);
                      const sorted = [...filtered];
                      switch (receiptSort) {
                          case "total_desc":
                              sorted.sort((a, b) => getReceiptNetTotal(b) - getReceiptNetTotal(a));
                              break;
                          case "total_asc":
                              sorted.sort((a, b) => getReceiptNetTotal(a) - getReceiptNetTotal(b));
                              break;
                          case "name_asc":
                              sorted.sort((a, b) => (a.storeName || "").localeCompare(b.storeName || ""));
                              break;
                          case "date_desc":
                          default:
                              sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      }
                      return sorted;
                  })()
                : [],
        [receipts, selectedStore, receiptSort]
    );

    const aggregatedItems = useMemo(() => {
        const map = new Map<
            string,
            { name: string; quantity: number; spend: number; category?: string; receipts: number; sampleReceiptId?: string; receiptLabels: string[] }
        >();
        selectedReceipts.forEach((r) => {
            r.items.forEach((i) => {
                const key = i.name.toLowerCase();
                const lineValue = applyReceiptSign(i.price * (i.quantity ?? 1), r.type);
                const label = `${new Date(r.date).toLocaleDateString()} - ${r.storeName || "Receipt"}`;
                if (map.has(key)) {
                    const agg = map.get(key)!;
                    agg.quantity += i.quantity;
                    agg.spend += lineValue;
                    agg.receipts += 1;
                    if (!agg.receiptLabels.includes(label)) {
                        agg.receiptLabels.push(label);
                    }
                } else {
                    map.set(key, {
                        name: i.name,
                        quantity: i.quantity,
                        spend: lineValue,
                        category: i.category,
                        receipts: 1,
                        sampleReceiptId: r.id,
                        receiptLabels: [label],
                    });
                }
            });
        });
        const sorted = Array.from(map.values());
        switch (itemSort) {
            case "name_asc":
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "qty_desc":
                sorted.sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
                break;
            case "spend_desc":
            default:
                sorted.sort((a, b) => Math.abs(b.spend) - Math.abs(a.spend));
        }
        return sorted.slice(0, 20);
    }, [selectedReceipts, itemSort]);

    const storeSummary = selectedSummary;
    const storeCount = summaries.length;
    const totalNet = useMemo(() => {
        return receipts.reduce((sum, r) => sum + getReceiptNetTotal(r), 0);
    }, [receipts]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 shadow-sm px-4 sm:px-6 py-4 flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">Stores</p>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900">Store Overview</h1>
                    <p className="text-xs text-gray-500 font-semibold">Browse spend by merchant.</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-right">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Stores</p>
                        <p className="text-lg font-black text-gray-900">{storeCount}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Net Spend</p>
                        <p className="text-lg font-black text-gray-900">{currency(totalNet)}</p>
                    </div>
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
                                    onClick={() => {
                                        setSelectedStore(store.storeName);
                                        setSelectedReceipt(null);
                                    }}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition ${
                                        isActive ? "bg-blue-50 border-l-4 border-blue-500" : ""
                                    }`}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900">{store.storeName}</p>
                                        <p className="text-xs text-gray-500">
                                            {store.receiptCount} receipts - {store.refundCount} refunds
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${store.netSpend < 0 ? "text-red-600" : "text-gray-900"}`}>
                                            {currency(store.netSpend)}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {selectedStore ? (
                        <>
                            {storeSummary && (
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-wrap gap-4 justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500">Store</p>
                                        <h2 className="text-2xl font-bold text-gray-900">{storeSummary.storeName}</h2>
                                        <p className="text-xs text-gray-500">{storeSummary.receiptCount} receipts - {storeSummary.refundCount} refunds</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Net spend</p>
                                        <p className="text-2xl font-black text-gray-900">{currency(storeSummary.netSpend)}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Receipts</h3>
                                    <select
                                        value={receiptSort}
                                        onChange={(e) => setReceiptSort(e.target.value as typeof receiptSort)}
                                        className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1"
                                    >
                                        <option value="date_desc">Newest</option>
                                        <option value="total_desc">Total (high to low)</option>
                                        <option value="total_asc">Total (low to high)</option>
                                        <option value="name_asc">Name (A-Z)</option>
                                    </select>
                                </div>
                                    <div className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto">
                                        {selectedReceipts.length === 0 && (
                                            <div className="py-4 text-sm text-gray-500 text-center">No receipts yet.</div>
                                        )}
                                        {selectedReceipts.map((r) => {
                                            const net = getReceiptNetTotal(r);
                                            return (
                                                <button
                                                    key={r.id}
                                                    onClick={() => setSelectedReceipt(r)}
                                                    className="w-full text-left py-3 flex justify-between items-center hover:bg-blue-50 rounded-lg px-2 transition"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-800">{r.storeName}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {r.storeLocation ? `${r.storeLocation} - ` : ''}
                                                            {new Date(r.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold ${net < 0 ? "text-red-600" : "text-gray-900"}`}>
                                                            {currency(net)}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Top items</h3>
                                        <select
                                            value={itemSort}
                                            onChange={(e) => setItemSort(e.target.value as typeof itemSort)}
                                            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1"
                                        >
                                            <option value="spend_desc">Top spend</option>
                                            <option value="qty_desc">Quantity</option>
                                            <option value="name_asc">Name (A-Z)</option>
                                        </select>
                                    </div>
                    <div className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto">
                        {aggregatedItems.length === 0 && (
                            <div className="py-4 text-sm text-gray-500 text-center">No items yet.</div>
                        )}
                        {aggregatedItems.map((item) => (
                            <div key={item.name} className="py-3">
                                <div className="flex justify-between items-center gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.category ? `${item.category} - ` : ''}{item.quantity} units - {item.receipts} receipts
                                        </p>
                                        <p className="text-[11px] text-gray-400">
                                            Receipts: {item.receiptLabels.slice(0, 3).join(' | ')}{item.receiptLabels.length > 3 ? ` +${item.receiptLabels.length - 3} more` : ''}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {item.receiptLabels.map((label, idx) => {
                                                const targetReceipt = selectedReceipts.find((r) => label.includes(r.storeName || '') && label.includes(new Date(r.date).toLocaleDateString())) || selectedReceipts.find((r) => r.id === item.sampleReceiptId);
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => {
                                                            if (targetReceipt) setSelectedReceipt(targetReceipt);
                                                        }}
                                                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline"
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className={`text-sm font-bold ${item.spend < 0 ? "text-red-600" : "text-gray-900"}`}>
                                        {currency(item.spend)}
                                    </p>
                                </div>
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

            {selectedReceipt && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedReceipt.storeName}</h3>
                                    {selectedReceipt.storeLocation && (
                                        <p className="text-xs font-semibold text-gray-500">{selectedReceipt.storeLocation}</p>
                                    )}
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${selectedReceipt.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {selectedReceipt.type === 'refund' ? 'refund' : 'purchase'}
                                </span>
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
                                                onDeleteReceipt(selectedReceipt.id, { skipConfirm: true });
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
                                    <p className="text-[10px] font-black uppercase text-blue-400">Total</p>
                                    <p className="text-2xl font-black text-blue-600">{currency(getReceiptNetTotal(selectedReceipt))}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Date</p>
                                    <p className="text-sm font-bold text-gray-900">{selectedReceipt.date}</p>
                                    {selectedReceipt.storeLocation && (
                                        <p className="text-xs font-semibold text-gray-500">{selectedReceipt.storeLocation}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h5 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Line Items</h5>
                                <div className="bg-gray-50 rounded-2xl p-2">
                                    {selectedReceipt.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0">
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-gray-800">{item.name}</p>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {item.category || 'Uncategorized'} - Qty {item.quantity}
                                                </p>
                                            </div>
                                            <p className="text-sm font-black text-gray-900">{currency(applyReceiptSign(item.price * item.quantity, selectedReceipt.type))}</p>
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
