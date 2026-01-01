
import React, { useState } from 'react';
import { Receipt, ReceiptItem } from '../types';

interface EditModalProps {
  receipt: Receipt;
  onSave: (receipt: Receipt) => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ receipt, onSave, onClose }) => {
  const [formData, setFormData] = useState<Receipt>({ ...receipt });

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    setFormData({ 
      ...formData, 
      items: [...formData.items, { name: 'New Item', price: 0, quantity: 1, category: 'Other' }] 
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-2xl z-[70] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">Standardize Record</h3>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Manual correction for extraction errors</p>
          </div>
          <button onClick={onClose} className="p-5 hover:bg-gray-100 rounded-[1.5rem] transition-all text-gray-400 hover:text-gray-900">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/2 bg-gray-50 p-12 flex items-center justify-center overflow-hidden">
             <div className="w-full h-full flex items-center justify-center bg-white rounded-[3rem] shadow-inner p-8 overflow-auto border border-gray-100">
                <img src={receipt.imageUrl} alt="Original Record" className="max-w-full h-auto rounded-xl shadow-2xl" />
             </div>
          </div>

          <div className="w-full lg:w-1/2 overflow-y-auto p-12 bg-white">
            <div className="max-w-xl mx-auto space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Store / Provider</label>
                  <input 
                    type="text" 
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Process Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Extracted Items</h4>
                  <button onClick={addItem} className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl hover:bg-blue-100 transition-all uppercase tracking-widest">
                    + Add Missing
                  </button>
                </div>
                
                <div className="space-y-5">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="p-6 bg-gray-50 rounded-[2rem] flex flex-col sm:flex-row gap-5 items-center group relative border-2 border-transparent hover:border-blue-100 transition-all shadow-sm">
                      <div className="flex-1 w-full">
                         <input 
                          className="w-full bg-transparent font-black text-gray-900 outline-none text-base placeholder:text-gray-300"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        />
                         <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">{item.category || 'General'}</p>
                      </div>
                      <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <div className="flex items-center bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-xs text-gray-300 font-black mr-2">$</span>
                           <input 
                              type="number" 
                              className="w-20 bg-transparent text-sm font-black text-gray-900 outline-none"
                              value={item.price}
                              onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                           />
                        </div>
                        <div className="flex items-center bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
                           <span className="text-xs text-gray-300 font-black mr-2">×</span>
                           <input 
                              type="number" 
                              className="w-10 bg-transparent text-sm font-black text-gray-900 outline-none text-center"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                           />
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-3 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                           </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-10 border-t border-gray-100 flex justify-between items-center">
                <div className="space-y-1">
                   <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Calculated Total</p>
                   <p className="text-5xl font-black text-blue-600 tracking-tighter">${formData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => {
                    const finalTotal = formData.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                    onSave({ ...formData, total: finalTotal });
                  }}
                  className="px-16 py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[2rem] shadow-2xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                  Confirm & Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
