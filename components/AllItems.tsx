
import React, { useState, useMemo } from 'react';
import { Receipt, ReceiptItem } from '../types';
import EditModal from './EditModal';

interface AllItemsProps {
  receipts: Receipt[];
  onUpdateReceipt: (updated: Receipt) => void;
}

interface ItemWithMetadata extends ReceiptItem {
  id: string; // Internal ID for list management
  receiptId: string;
  storeName: string;
  date: string;
}

const AllItems: React.FC<AllItemsProps> = ({ receipts, onUpdateReceipt }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

  const allItems = useMemo(() => {
    const items: ItemWithMetadata[] = [];
    receipts.forEach(r => {
      r.items.forEach((i, idx) => {
        items.push({
          ...i,
          id: `${r.id}-${idx}`,
          receiptId: r.id,
          storeName: r.storeName,
          date: r.date
        });
      });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allItems, searchTerm]);

  const handleDeleteItem = (item: ItemWithMetadata) => {
    const parent = receipts.find(r => r.id === item.receiptId);
    if (!parent) return;

    if (window.confirm(`Remove "${item.name}" from your records? This will update the receipt total.`)) {
      const updatedItems = parent.items.filter(i => i.name !== item.name || i.price !== item.price);
      const updatedTotal = updatedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      onUpdateReceipt({
        ...parent,
        items: updatedItems,
        total: updatedTotal
      });
    }
  };

  const handleEditItem = (item: ItemWithMetadata) => {
    const parent = receipts.find(r => r.id === item.receiptId);
    if (parent) setEditingReceipt(parent);
  };

  const handleViewReceipt = (item: ItemWithMetadata) => {
    const parent = receipts.find(r => r.id === item.receiptId);
    if (parent) setSelectedReceipt(parent);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search items, categories, or stores..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
           <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{filteredItems.length} Items Tracked</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Purchased Item</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Store Context</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Category</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Price</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5 cursor-pointer" onClick={() => handleViewReceipt(item)}>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Quantity: {item.quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 cursor-pointer" onClick={() => handleViewReceipt(item)}>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-700">{item.storeName}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {item.category && (
                          <span className="px-2.5 py-1 bg-white text-blue-600 text-[9px] font-black uppercase rounded-lg border border-blue-100 shadow-sm">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-sm font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleViewReceipt(item)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View Parent Receipt"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleEditItem(item)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Edit Receipt"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-4 text-gray-200">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-black text-sm uppercase tracking-widest">No matching items tracked</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick View Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedReceipt.storeName}</h3>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="p-3 hover:bg-gray-200 rounded-2xl transition-all"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="flex justify-between items-center bg-blue-50/50 p-6 rounded-[2rem]">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Total Bill</p>
                  <p className="text-3xl font-black text-blue-600">${selectedReceipt.total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Date</p>
                  <p className="text-sm font-bold text-gray-900">{selectedReceipt.date}</p>
                </div>
              </div>
              <div>
                <h5 className="font-black text-gray-400 uppercase text-[10px] tracking-[0.2em] mb-4">Original Scan</h5>
                <img src={selectedReceipt.imageUrl} alt="Receipt Scan" className="w-full rounded-[2rem] border-4 border-gray-50 shadow-sm" />
              </div>
            </div>
            <div className="p-8 bg-white border-t border-gray-100">
               <button 
                onClick={() => {
                  setEditingReceipt(selectedReceipt);
                  setSelectedReceipt(null);
                }}
                className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-all active:scale-95 uppercase text-xs tracking-widest"
               >
                 Go to Full Edit Mode
               </button>
            </div>
          </div>
        </div>
      )}

      {editingReceipt && (
        <EditModal 
          receipt={editingReceipt}
          onSave={(updated) => {
            onUpdateReceipt(updated);
            setEditingReceipt(null);
          }}
          onClose={() => setEditingReceipt(null)}
        />
      )}
    </div>
  );
};

export default AllItems;
