import React, { useRef, useState } from 'react';
import { Receipt, ReceiptItem } from '../types';
import { withNormalizedTotal } from '../services/totals';
import ImageCropperModal from './ImageCropperModal';
import { extractReceiptData } from '../services/geminiService';
import { storage } from '../services/firebaseConfig';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';

interface EditModalProps {
  receipt: Receipt;
  onSave: (receipt: Receipt) => void;
  onClose: () => void;
  userId?: string;
}

const EditModal: React.FC<EditModalProps> = ({ receipt, onSave, onClose, userId }) => {
  const [formData, setFormData] = useState<Receipt>({ ...withNormalizedTotal(receipt) });
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const adjustQuantity = (index: number, delta: number) => {
    setFormData(prev => {
      const items = [...prev.items];
      const current = items[index]?.quantity ?? 0;
      const next = Math.max(0, current + delta);
      items[index] = { ...items[index], quantity: next };
      return { ...prev, items };
    });
  };

  const uploadImageToStorage = async (dataUrl: string) => {
    const owner = userId || (receipt as any).userId;
    if (!owner) {
      setImageError('Sign in required before uploading receipt images.');
      throw new Error('Missing userId for upload');
    }
    setIsUploadingImage(true);
    try {
      const imageRef = ref(storage, `receipts/${owner}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
      await uploadString(imageRef, dataUrl, 'data_url');
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (err) {
      console.warn('Image upload failed', err);
      setImageError('Upload failed. Please try again.');
      throw err;
    } finally {
      setIsUploadingImage(false);
    }
  };

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
      items: [...formData.items, { name: 'New Item', price: 0, quantity: 1, category: 'Other' }],
    });
  };

  const resizeImage = (base64Str: string, maxWidth = 1200, maxHeight = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
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

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const data = reader.result as string;
          const parts = data?.split(',');
          resolve(parts?.[1] ?? null);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Failed to fetch image for rescan', err);
      return null;
    }
  };

  const performRescan = async (base64Image: string) => {
    setImageError(null);
    setIsRescanning(true);
    try {
      const extracted = await extractReceiptData(base64Image);
      setFormData((prev) => ({
        ...prev,
        storeName: extracted.storeName ?? prev.storeName,
        date: extracted.date ?? prev.date,
        time: extracted.time ?? prev.time,
        total: extracted.total ?? prev.total,
        currency: extracted.currency ?? prev.currency,
        storeLocation: extracted.storeLocation ?? prev.storeLocation,
        items: extracted.items ?? prev.items,
        type: extracted.type ?? prev.type,
      }));
    } catch (err: any) {
      console.error(err);
      const code = err?.code || err?.message || '';
      const isLimit = typeof code === 'string' && code.toLowerCase().includes('resource-exhausted');
      if (isLimit) {
        setImageError('Scan limit reached for your plan. Please upgrade to continue.');
      } else {
        setImageError('Rescan failed. Please try again.');
      }
    } finally {
      setIsRescanning(false);
    }
  };

  const handleRescan = async () => {
    if (!formData.imageUrl) return;
    let base64 = formData.imageUrl.startsWith('data:') ? formData.imageUrl.split(',')[1] : null;
    if (!base64) {
      base64 = await fetchImageAsBase64(formData.imageUrl);
    }
    if (!base64) {
      setImageError('Image data unavailable for rescanning.');
      return;
    }
    await performRescan(base64);
  };

  const ensureImageUploaded = async (current?: string) => {
    if (!current) return current;
    if (!current.startsWith('data:')) return current;
    return uploadImageToStorage(current);
  };

  const handleImageChange = async (file: File) => {
    setImageError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const resized = await resizeImage(base64);
      const uploadedUrl = await uploadImageToStorage(resized);
      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));

      const dataPart = resized.split(',')[1];
      if (dataPart) {
        await performRescan(dataPart);
      }
    } catch (err) {
      console.error(err);
      setImageError('Could not process that image. Try another photo.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-2xl z-[70] flex items-start sm:items-center justify-center p-0 sm:p-6 py-4 sm:py-6 overflow-y-auto">
        <div className="bg-white w-full max-w-7xl max-h-none sm:max-h-[95vh] min-h-screen sm:min-h-0 rounded-none sm:rounded-[4rem] shadow-2xl flex flex-col overflow-y-auto animate-in zoom-in-95 duration-500">
          <div className="px-6 sm:px-10 py-4 sm:py-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Standardize Record</h3>
              <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Manual correction for extraction errors</p>
            </div>
            <button onClick={onClose} className="p-3 sm:p-5 hover:bg-gray-100 rounded-[1.25rem] transition-all text-gray-400 hover:text-gray-900">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="w-full lg:w-1/2 bg-gray-50 px-4 sm:px-8 lg:px-12 py-4 sm:py-10 flex items-start justify-center overflow-y-auto max-h-[70vh] lg:max-h-[82vh]">
              <div className="w-full h-auto max-h-full sm:h-full flex items-center justify-center bg-white rounded-2xl sm:rounded-[3rem] shadow-inner p-4 sm:p-8 overflow-auto border border-gray-100">
                {formData.imageUrl ? (
                  <div className="relative w-full h-auto sm:h-full flex flex-col items-center justify-start">
                    {/* Mobile controls */}
                    <div className="mb-3 sm:mb-4 flex w-full flex-wrap gap-2 justify-center sm:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border border-gray-100 rounded-xl p-2 shadow-sm">
                      <button
                        onClick={handleRescan}
                        disabled={isRescanning}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-black rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-60"
                      >
                        {isRescanning ? 'Rescanning...' : 'Rescan with AI'}
                      </button>
                      <button
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: undefined }))}
                        className="px-3 py-2 bg-white/90 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-white"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setIsCropping(true)}
                        className="px-3 py-2 bg-gray-900 text-white text-xs font-black rounded-xl shadow-sm hover:bg-gray-800"
                      >
                        Crop
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-blue-600 text-white text-xs font-black rounded-xl shadow-sm hover:bg-blue-700"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3 py-2 bg-blue-500 text-white text-xs font-black rounded-xl shadow-sm hover:bg-blue-600"
                      >
                        Take Photo
                      </button>
                    </div>
                    <img
                      src={formData.imageUrl}
                      alt="Receipt"
                      className="w-full h-auto max-h-[60vh] sm:max-h-[76vh] object-contain rounded-xl shadow-2xl"
                    />
                    <div className="hidden sm:flex mt-3 w-full flex-wrap gap-2 justify-center sm:absolute sm:top-4 sm:left-0 sm:right-0 sm:mt-0 sm:px-4 sm:justify-end bg-white/95 sm:bg-white/85 px-2 py-2 rounded-xl shadow-sm z-10">
                      <button
                        onClick={handleRescan}
                        disabled={isRescanning}
                        className="px-2.5 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:px-3 sm:py-2 sm:text-xs sm:rounded-xl"
                      >
                        {isRescanning ? 'Rescanning...' : 'Rescan with AI'}
                      </button>
                      <button
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: undefined }))}
                        className="px-2.5 py-1.5 bg-white/90 border border-gray-200 text-gray-600 text-[10px] font-semibold rounded-lg hover:bg-white sm:px-3 sm:py-2 sm:text-xs sm:rounded-xl"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setIsCropping(true)}
                        className="px-2.5 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-gray-800 sm:px-3 sm:py-2 sm:text-xs sm:rounded-xl"
                      >
                        Crop
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-blue-700 sm:px-3 sm:py-2 sm:text-xs sm:rounded-xl"
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-blue-500 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-blue-600 sm:px-3 sm:py-2 sm:text-xs sm:rounded-xl"
                      >
                        Take Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">No receipt photo yet</p>
                      <p className="text-xs text-gray-500 font-semibold">Add a photo now or leave it empty.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white text-xs font-black rounded-xl shadow-sm hover:bg-blue-700"
                      >
                        Attach photo
                      </button>
                      <button
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: undefined }))}
                        className="px-4 py-2 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-50"
                      >
                        Add later
                      </button>
                    </div>
                    {imageError && <p className="text-xs text-red-500 font-semibold">{imageError}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-1/2 overflow-y-auto p-6 sm:p-12 bg-white">
              <div className="max-w-xl mx-auto space-y-8 sm:space-y-12 pb-20 sm:pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Store / Provider</label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full p-4 sm:p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] sm:rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm text-base sm:text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Process Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full p-4 sm:p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] sm:rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm text-base sm:text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Store Location</label>
                    <input
                      type="text"
                      value={formData.storeLocation ?? ''}
                      onChange={(e) => setFormData({ ...formData, storeLocation: e.target.value })}
                      className="w-full p-4 sm:p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] sm:rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm text-base sm:text-lg"
                      placeholder="City, State or City, Country"
                    />
                  </div>
                  <div />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-widest text-blue-500 ml-1">Transaction Type</label>
                    <select
                      value={formData.type ?? 'purchase'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'purchase' | 'refund' })}
                      className="w-full p-4 sm:p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] sm:rounded-[1.8rem] font-black text-gray-900 outline-none transition-all shadow-sm bg-white text-base sm:text-lg"
                    >
                      <option value="purchase">Purchase</option>
                      <option value="refund">Refund</option>
                    </select>
                  </div>
                  <div />
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Extracted Items</h4>
                    <button onClick={addItem} className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl hover:bg-blue-100 transition-all uppercase tracking-widest">
                      + Add Missing
                    </button>
                  </div>

                    <div className="space-y-4 sm:space-y-5">
                    {formData.items.map((item, idx) => (
                        <div key={idx} className="p-4 sm:p-6 bg-gray-50 rounded-[1.8rem] flex flex-col sm:flex-row gap-4 sm:gap-5 items-center group relative border-2 border-transparent hover:border-blue-100 transition-all shadow-sm">
                        <div className="flex-1 w-full">
                          <input
                            className="w-full bg-transparent font-black text-gray-900 outline-none text-base sm:text-lg placeholder:text-gray-300"
                            value={item.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          />
                          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">{item.category || 'General'}</p>
                        </div>
                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                          <div className="flex items-center bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border border-gray-100 shadow-sm">
                            <span className="text-xs text-gray-300 font-black mr-2">$</span>
                            <input
                              type="number"
                              className="w-20 bg-transparent text-sm font-black text-gray-900 outline-none"
                              value={item.price}
                              onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex items-center bg-white px-2 py-2 sm:px-3 sm:py-3 rounded-2xl border border-gray-100 shadow-sm space-x-2">
                            <button
                              type="button"
                              onClick={() => adjustQuantity(idx, -1)}
                              className="px-2 py-1 bg-gray-100 rounded-lg text-gray-700 font-bold text-sm hover:bg-gray-200"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              className="w-12 bg-transparent text-sm font-black text-gray-900 outline-none text-center"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            />
                            <button
                              type="button"
                              onClick={() => adjustQuantity(idx, 1)}
                              className="px-2 py-1 bg-gray-100 rounded-lg text-gray-700 font-bold text-sm hover:bg-gray-200"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button onClick={() => removeItem(idx)} className="p-2 sm:p-3 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-xl">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10 border-t border-gray-100 flex flex-col gap-4 sm:flex-row sm:gap-0 sm:justify-between sm:items-center sm:sticky sm:bottom-0 sm:bg-white sm:pb-6">
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">Calculated Total</p>
                    <p className="text-3xl sm:text-5xl font-black text-blue-600 tracking-tighter">${(formData.items.reduce((sum, i) => sum + i.price * i.quantity, 0) * (formData.type === 'refund' ? -1 : 1)).toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (isSaving) return;
                      setIsSaving(true);
                      try {
                        const finalImageUrl = await ensureImageUploaded(formData.imageUrl);
                        const finalTotal = Math.abs(formData.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
                        await Promise.resolve(onSave({ ...formData, total: finalTotal, imageUrl: finalImageUrl }));
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:hover:bg-blue-600 disabled:opacity-70 text-white font-black rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest text-[11px] sm:px-12 sm:py-5 sm:rounded-[2rem] sm:text-xs"
                  >
                    {isSaving ? 'Saving...' : 'Confirm & Sync'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageChange(file);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageChange(file);
          e.target.value = '';
        }}
      />
      {isCropping && formData.imageUrl && (
        <ImageCropperModal
          imageUrl={formData.imageUrl}
          onCancel={() => setIsCropping(false)}
          onSave={async (cropped) => {
            const uploadedUrl = await uploadImageToStorage(cropped);
            setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
            setIsCropping(false);
          }}
        />
      )}
    </>
  );
};

export default EditModal;
