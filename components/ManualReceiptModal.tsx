import React, { useMemo, useRef, useState } from "react";
import { Receipt, ReceiptItem } from "../types";

interface ManualReceiptModalProps {
    onSave: (receipt: Receipt) => void;
    onClose: () => void;
}

const ManualReceiptModal: React.FC<ManualReceiptModalProps> = ({ onSave, onClose }) => {
    const toTitleCase = (value: string) =>
        value
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());

    const [formData, setFormData] = useState<Receipt>(() => ({
        id: Math.random().toString(36).slice(2, 9),
        storeName: "",
        storeLocation: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 8),
        type: "purchase",
        total: 0,
        currency: "USD",
        items: [{ name: "", price: 0, quantity: 1, category: "General" }],
        createdAt: Date.now(),
        status: "processed",
        source: "manual",
        imageUrl: undefined,
    }));
    const [imageError, setImageError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculatedTotal = useMemo(() => {
        const sign = formData.type === "refund" ? -1 : 1;
        const sum = formData.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        return sign * sum;
    }, [formData.items, formData.type]);

    const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
        setFormData((prev) => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            return { ...prev, items };
        });
    };

    const removeItem = (index: number) => {
        setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
    };

    const addItem = () => {
        setFormData((prev) => ({
            ...prev,
            items: [...prev.items, { name: "", price: 0, quantity: 1, category: "General" }],
        }));
    };

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
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                resolve(dataUrl);
            };
            img.onerror = (e) => reject(e);
        });
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
            setFormData((prev) => ({ ...prev, imageUrl: resized }));
        } catch (err) {
            console.error(err);
            setImageError("Could not process that image. Try a different photo.");
        }
    };

    const handleSave = () => {
        onSave({
            ...formData,
            storeName: formData.storeName?.trim() || "Unknown Store",
            storeLocation: formData.storeLocation ? toTitleCase(formData.storeLocation) : "",
            total: Math.abs(calculatedTotal),
            createdAt: Date.now(),
        });
    };

    return (
        <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white w-full max-w-6xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
                <div className="flex items-start sm:items-center justify-between px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 gap-3">
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">Manual entry</p>
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">Add a receipt without a photo</h2>
                        <p className="text-xs sm:text-sm text-gray-500 font-semibold mt-2">
                            Fill in the same details we extract from images: store, date, line items, and totals.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-3 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors shrink-0"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 sm:gap-6 p-5 sm:p-8 max-h-[80vh] overflow-y-auto">
                    <div className="md:col-span-2 space-y-6">
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Receipt basics</p>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Store / merchant</label>
                                        <input
                                            value={formData.storeName}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, storeName: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        placeholder="e.g., Trader Joe's"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-500">Store location</label>
                                    <input
                                        value={formData.storeLocation ?? ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, storeLocation: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        placeholder="City, State or City, Country"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Date</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Type</label>
                                        <select
                                            value={formData.type ?? "purchase"}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as "purchase" | "refund" }))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900 bg-white"
                                        >
                                            <option value="purchase">Purchase</option>
                                            <option value="refund">Refund</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Time</label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Currency</label>
                                        <input
                                            value={formData.currency}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-gray-500">Notes</label>
                                        <input
                                            value={formData.rawText ?? ""}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, rawText: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                            placeholder="Optional memo"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Source</p>
                                            <p className="font-black text-gray-900">Manual entry</p>
                                        </div>
                                        <span className="px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] bg-blue-50 text-blue-600 rounded-full">
                                            Manual
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100">Auto total</p>
                                <div className="flex items-end justify-between mt-2">
                                    <div>
                                        <p className="text-4xl font-black tracking-tight">${calculatedTotal.toFixed(2)}</p>
                                        <p className="text-sm font-semibold text-blue-100 mt-1">Sum of all line items</p>
                                    </div>
                                    <div className="text-sm font-black bg-white/15 px-4 py-2 rounded-xl backdrop-blur border border-white/20">
                                        {formData.items.length} line item{formData.items.length === 1 ? "" : "s"}
                                    </div>
                                </div>
                            </div>

                                <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Receipt photo</p>
                                        <p className="text-sm text-gray-500 font-semibold">Optional - attach now or add later.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.imageUrl && (
                                            <button
                                                onClick={() => setFormData((prev) => ({ ...prev, imageUrl: undefined }))}
                                                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                                            >
                                                Remove / add later
                                            </button>
                                        )}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-black hover:bg-blue-700"
                                        >
                                            {formData.imageUrl ? "Replace photo" : "Attach photo"}
                                        </button>
                                    </div>
                                </div>
                                {imageError && <p className="text-xs text-red-500 font-semibold">{imageError}</p>}
                                {!formData.imageUrl && (
                                    <p className="text-xs text-gray-500 font-semibold">You can save without a photo and attach it later.</p>
                                )}
                                {formData.imageUrl && (
                                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                                        <img src={formData.imageUrl} alt="Receipt preview" className="w-full object-contain max-h-60 bg-gray-50" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Line items</p>
                                <p className="text-sm text-gray-500 font-semibold">Add each product/service just like a scanned receipt.</p>
                            </div>
                            <button
                                onClick={addItem}
                                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-colors"
                            >
                                + Add item
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1 sm:pr-2">
                            {formData.items.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                    <div className="flex flex-col sm:flex-row items-start gap-3">
                                        <div className="flex-1 space-y-3 w-full">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-500">Item name</label>
                                                <input
                                                    value={item.name}
                                                    onChange={(e) => updateItem(idx, "name", e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                                    placeholder="e.g., Organic Milk"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Quantity</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-500">Unit price</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                        />
                                    </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-gray-500">Category</label>
                                                    <input
                                                        value={item.category ?? ""}
                                                        onChange={(e) => updateItem(idx, "category", e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none font-semibold text-gray-900"
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-xs font-semibold text-gray-500">
                                                Line total:{" "}
                                                <span className="text-gray-900">
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Remove item"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-8 py-6 border-t border-gray-100 bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ready to save</p>
                        <p className="text-xl font-black text-gray-900">
                            {formData.storeName ? formData.storeName : "Unnamed store"} - {formData.items.length} item
                            {formData.items.length === 1 ? "" : "s"}
                        </p>
                    </div>
                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                            <button
                                                onClick={onClose}
                                                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-center"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-center"
                                            >
                                                Save receipt - ${calculatedTotal.toFixed(2)}
                                            </button>
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
                e.target.value = "";
            }}
        />
        </>
    );
};

export default ManualReceiptModal;
