
import React, { useState, useRef, useEffect } from 'react';
import { extractReceiptData } from '../services/geminiService';
import { Receipt } from '../types';
import EditModal from './EditModal';
import ManualReceiptModal from './ManualReceiptModal';

interface ReceiptScannerProps {
  onReceiptProcessed: (receipt: Receipt) => void;
  onFinished: () => void;
}

interface QueuedItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'verified' | 'error';
  fullData?: Receipt;
  error?: string;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onReceiptProcessed, onFinished }) => {
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [isAnyProcessing, setIsAnyProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<QueuedItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newItems: QueuedItem[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setQueue(prev => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const processQueue = async () => {
    if (isAnyProcessing) return;

    const nextItem = queue.find(item => item.status === 'pending');
    if (!nextItem) return;

    setIsAnyProcessing(true);
    updateItemStatus(nextItem.id, 'processing');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(nextItem.file);
      });

      const originalBase64 = await base64Promise;
      const resizedDataUrl = await resizeImage(originalBase64);
      const base64ForAi = resizedDataUrl.split(',')[1];

      const extracted = await extractReceiptData(base64ForAi);

      const newReceipt: Receipt = {
        id: Math.random().toString(36).substr(2, 9),
        storeName: extracted.storeName || 'Unknown Store',
        date: extracted.date || new Date().toISOString().split('T')[0],
        time: extracted.time || '00:00:00',
        total: extracted.total || 0,
        currency: extracted.currency || 'USD',
        items: extracted.items || [],
        imageUrl: resizedDataUrl,
        createdAt: Date.now(),
        source: 'scan',
        status: 'processed',
      };

      // Generate Hash
      const dataString = `${newReceipt.storeName}|${newReceipt.date}|${newReceipt.time}|${newReceipt.total}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      newReceipt.hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      onReceiptProcessed(newReceipt);

      setQueue(prev => prev.map(item =>
        item.id === nextItem.id ? {
          ...item,
          status: 'verified',
          fullData: newReceipt
        } : item
      ));

    } catch (err) {
      console.error(err);
      updateItemStatus(nextItem.id, 'error', 'AI Extraction failed');
    } finally {
      setIsAnyProcessing(false);
    }
  };

  useEffect(() => {
    processQueue();
  }, [queue, isAnyProcessing]);

  const updateItemStatus = (id: string, status: QueuedItem['status'], error?: string) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status, error } : item
    ));
  };

  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const completedCount = queue.filter(i => i.status === 'verified' || i.status === 'error').length;
  const progressPercent = queue.length > 0 ? (completedCount / queue.length) * 100 : 0;
  const allDone = queue.length > 0 && completedCount === queue.length;

  return (
    <div className="flex flex-col items-center min-h-[600px] space-y-8 max-w-6xl mx-auto w-full pb-32">
      <div className="w-full bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden relative">

        {queue.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-gray-50 z-10">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}

        <div className="flex justify-between items-end mb-10 pt-4">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Batch Analyzer</h2>
            <div className="flex items-center space-x-3">
              <p className="text-gray-500 font-bold">
                {queue.length === 0 ? "Select multiple scripts/receipts" : `${completedCount} of ${queue.length} Analyzed`}
              </p>
              {isAnyProcessing && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">AI Extraction Active</span>
                </div>
              )}
            </div>
          </div>

          {queue.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl text-sm font-black hover:bg-blue-100 transition-all flex items-center space-x-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add More Scripts</span>
              </button>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-gray-800 transition-all flex items-center space-x-2 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h14M12 5v14" />
                </svg>
                <span>Enter Manually</span>
              </button>
            </div>
          )}
        </div>

        {queue.length === 0 ? (
          <div
            className="border-4 border-dashed border-gray-100 rounded-[3.5rem] p-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-200 hover:bg-blue-50/20 transition-all group"
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg"
              >
                Take Photo
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white text-blue-600 rounded-2xl text-sm font-black hover:bg-blue-50 transition-all border border-blue-100 shadow-sm"
              >
                Upload from Gallery
              </button>
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-gray-800 transition-all shadow-lg"
              >
                Enter Manually
              </button>
            </div>
            <div className="w-28 h-28 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-2xl shadow-blue-200">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-3xl font-black text-gray-800 tracking-tight">Upload Batch</p>
            <p className="text-gray-400 font-bold mt-2 text-center max-w-sm">Process 20+ images simultaneously. We'll extract and save every detail automatically.</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.status === 'verified' && setEditingItem(item)}
                    className={`relative group aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm transition-all bg-gray-50 cursor-pointer ${item.status === 'verified' ? 'hover:ring-8 ring-blue-500/10' : ''
                      }`}
                  >
                    <img src={item.preview} alt="Preview" className="w-full h-full object-cover" />

                    <div className={`absolute inset-0 flex flex-col items-center justify-center px-4 text-center transition-all ${item.status === 'processing' ? 'bg-blue-600/70 backdrop-blur-md' :
                        item.status === 'verified' ? 'bg-gray-900/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm' :
                          item.status === 'error' ? 'bg-red-600/80 backdrop-blur-sm' : 'bg-black/10'
                      }`}>
                      {item.status === 'processing' && (
                        <div className="flex flex-col items-center space-y-3">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Processing</span>
                        </div>
                      )}

                      {item.status === 'verified' && (
                        <div className="text-white flex flex-col items-center space-y-2 scale-90 group-hover:scale-100 transition-transform">
                          <div className="w-14 h-14 bg-white text-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <span className="font-black text-[10px] uppercase tracking-widest">Edit Details</span>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="text-white space-y-1">
                          <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-[10px] font-black uppercase">Retry Required</p>
                        </div>
                      )}
                    </div>

                    {item.status === 'verified' && item.fullData && (
                      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl pointer-events-none group-hover:opacity-0 transition-opacity">
                        <p className="text-[10px] font-black truncate text-gray-900 leading-none mb-1.5">{item.fullData.storeName}</p>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-blue-600">${item.fullData.total.toFixed(2)}</p>
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.status !== 'processing' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg z-10 transition-all active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-10 border-t border-gray-100 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${isAnyProcessing ? 'bg-blue-500 animate-pulse' : 'bg-green-500 shadow-lg shadow-green-100'}`}></div>
                <div className="text-sm">
                  <p className="font-black text-gray-900 tracking-tight">{allDone ? "Batch finalized & saved" : `Running Intelligence Analysis...`}</p>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">{completedCount} items of {queue.length} ready</p>
                </div>
              </div>

              <div className="flex space-x-4 w-full md:w-auto">
                <button
                  onClick={() => setQueue([])}
                  className="flex-1 md:flex-none px-10 py-5 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black rounded-2xl transition-all uppercase text-xs tracking-widest"
                >
                  Clear Queue
                </button>
                <button
                  onClick={onFinished}
                  className={`flex-1 md:flex-none px-14 py-5 font-black rounded-[1.5rem] transition-all shadow-2xl ${allDone ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                    }`}
                  disabled={!allDone}
                >
                  {allDone ? "Sync & Close" : "Processing Batch..."}
                </button>
              </div>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleFileChange}
        />
      </div>

      {editingItem && editingItem.fullData && (
        <EditModal
          receipt={editingItem.fullData}
          onSave={(updated) => {
            onReceiptProcessed(updated);
            setQueue(prev => prev.map(item =>
              item.id === editingItem.id ? { ...item, status: 'verified', fullData: updated } : item
            ));
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}

      {isManualModalOpen && (
        <ManualReceiptModal
          onClose={() => setIsManualModalOpen(false)}
          onSave={(receipt) => {
            onReceiptProcessed(receipt);
            setIsManualModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ReceiptScanner;
