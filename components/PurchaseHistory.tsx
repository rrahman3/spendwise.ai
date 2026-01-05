
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';
import EditModal from './EditModal';

type SortKey = 'storeName' | 'total' | 'date';

interface PurchaseHistoryProps {
  receipts: Receipt[];
  onScanClick?: () => void;
  onUpdateReceipt: (updated: Receipt) => void;
  onDeleteReceipt: (receiptId: string) => void;
  onReviewClick: () => void;
  receiptsToReviewCount: number;
}

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ receipts, onScanClick, onUpdateReceipt, onDeleteReceipt, onReviewClick, receiptsToReviewCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false); // Sort descending by default
  const [sourceFilter, setSourceFilter] = useState<'all' | 'scan' | 'csv' | 'manual'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'pending_review'>('all');

  const sortedAndFilteredReceipts = useMemo(() => {
    const filtered = receipts.filter(r => {
      const receiptStatus = r.status ?? 'processed';
      const matchesSearch =
        r.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSource = sourceFilter === 'all' ? true : r.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' ? true : receiptStatus === statusFilter;
      return matchesSearch && matchesSource && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let compareA, compareB;

      switch (sortKey) {
        case 'storeName':
          compareA = a.storeName.toLowerCase();
          compareB = b.storeName.toLowerCase();
          break;
        case 'total':
          compareA = a.total;
          compareB = b.total;
          break;
        case 'date':
        default:
          compareA = new Date(a.date).getTime();
          compareB = new Date(b.date).getTime();
          break;
      }

      if (compareA < compareB) {
        return sortAsc ? -1 : 1;
      }
      if (compareA > compareB) {
        return sortAsc ? 1 : -1;
      }
      return 0;
    });
  }, [receipts, searchTerm, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'storeName'); // Default to A-Z for store name
    }
  };

  if (receipts.length === 0 && receiptsToReviewCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-6">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">No receipts yet</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-2">Your scanned receipts will appear here. Start by adding your first one!</p>
        </div>
        <button
          onClick={onScanClick}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
        >
          Scan First Receipt
        </button>
      </div>
    );
  }

  const handleSaveEdit = (updated: Receipt) => {
    onUpdateReceipt(updated);
    setSelectedReceipt(updated);
    setIsEditing(false);
  };
  
  const getSortIcon = (key: SortKey) => {
    if (key !== sortKey) return '↕';
    return sortAsc ? '↑' : '↓';
  };

  return (
    <div className="space-y-6 pb-20">
      {receiptsToReviewCount > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg flex justify-between items-center shadow-md">
          <div>
            <p className="font-bold">You have {receiptsToReviewCount} potential duplicate(s) to review.</p>
          </div>
          <button
            onClick={onReviewClick}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-all active:scale-95 shadow-sm"
          >
            Review Now
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search stores or items..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex-shrink-0 flex gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          {(['date', 'storeName', 'total'] as SortKey[]).map(key => (
              <button 
                key={key}
                onClick={() => handleSort(key)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${sortKey === key ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}>
                {key.charAt(0).toUpperCase() + key.slice(1)} {getSortIcon(key)}
              </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Source</span>
          {(['all','scan','csv','manual'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${sourceFilter === s ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Status</span>
          {(['all','processed','pending_review'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${statusFilter === s ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredReceipts.map(receipt => (
          <div
            key={receipt.id}
            onClick={() => { setSelectedReceipt(receipt); setIsEditing(true); }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{receipt.storeName}</h4>
                <p className="text-xs text-gray-500">{new Date(receipt.date).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-lg font-bold text-gray-900">${receipt.total.toFixed(2)}</span>
                <div className="flex gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{receipt.source}</span>
                  <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${
                    (receipt.status ?? 'processed') === 'pending_review' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {(receipt.status ?? 'processed').replace('_',' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {Array.from(new Set(receipt.items.map(i => i.category))).slice(0, 2).map(cat => (
                <span key={cat} className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {cat || 'Item'}
                </span>
              ))}
              {receipt.items.length > 2 && <span className="text-[10px] text-gray-400 font-medium self-center">+{receipt.items.length - 2} more</span>}
            </div>

            <div className="flex items-center text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scanned {new Date(receipt.createdAt).toLocaleDateString()}
            </div>
            <div className="absolute inset-x-0 bottom-3 px-5 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedReceipt(receipt); setIsEditing(true); }}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Delete this receipt?")) onDeleteReceipt(receipt.id);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-full bg-red-50 text-red-600 hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        <div
          onClick={onScanClick}
          className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all cursor-pointer group bg-gray-50/30"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Add Receipt</span>
        </div>
      </div>

      {selectedReceipt && !isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedReceipt.storeName}</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                  title="Edit this record"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this receipt? This cannot be undone.")) {
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
                  <p className="text-2xl font-black text-blue-600">${selectedReceipt.total.toFixed(2)}</p>
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
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{item.category} • Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
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

      {isEditing && selectedReceipt && (
        <EditModal
          receipt={selectedReceipt}
          onSave={handleSaveEdit}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};

export default PurchaseHistory;
