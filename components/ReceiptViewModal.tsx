import React from "react";
import { Receipt } from "../types";
import { applyReceiptSign, getReceiptNetTotal } from "../services/totals";

interface ReceiptViewModalProps {
  receipt: Receipt;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
}

const currency = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;

const ReceiptViewModal: React.FC<ReceiptViewModalProps> = ({ receipt, onClose, onEdit, onDelete }) => {
  const net = getReceiptNetTotal(receipt);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{receipt.storeName}</h3>
              {receipt.storeLocation && (
                <p className="text-xs font-semibold text-gray-500">{receipt.storeLocation}</p>
              )}
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                title="Edit this record"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(receipt.id)}
                className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                title="Delete this record"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            title="Close"
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-blue-600">{currency(net)}</p>
                <span
                  className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${
                    receipt.type === "refund" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {receipt.type === "refund" ? "refund" : "purchase"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400">Date</p>
              <p className="text-sm font-bold text-gray-900">{receipt.date}</p>
              {receipt.storeLocation && (
                <p className="text-xs font-semibold text-gray-500">{receipt.storeLocation}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Line Items</h5>
            <div className="bg-gray-50 rounded-2xl p-2">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-800">{item.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                      {item.category || "Uncategorized"} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-black text-gray-900">
                    {currency(applyReceiptSign(item.price * item.quantity, receipt.type))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {receipt.imageUrl && (
            <div className="pt-2">
              <h5 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest mb-3">Stored document</h5>
              <img src={receipt.imageUrl} alt="Receipt" className="w-full rounded-2xl border border-gray-100 shadow-sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptViewModal;
