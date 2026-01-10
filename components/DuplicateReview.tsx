
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';
import { applyReceiptSign, getReceiptNetTotal } from '../services/totals';

// --- SVG Arrow Icons ---
const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);


// --- Helper: Receipt Details Component ---
const ReceiptDetails: React.FC<{ 
    receipt: Receipt | null | undefined, 
    title: string, 
    color: 'green' | 'orange',
    onClick: () => void 
}> = ({ receipt, title, color, onClick }) => {
    const cardClasses = `bg-white p-6 rounded-2xl border-2 border-${color}-500 shadow-lg cursor-pointer hover:shadow-xl transition-shadow`;

    if (!receipt) {
        return (
            <div className={cardClasses}>
                <h3 className={`text-lg font-bold mb-4 text-${color}-700`}>{title}</h3>
                <p className="text-gray-500">Receipt not found.</p>
            </div>
        );
    }

    const netTotal = getReceiptNetTotal(receipt);
    const totalItems = receipt.items?.reduce((sum, item) => sum + applyReceiptSign(item.price * (item.quantity ?? 1), receipt.type), 0) || 0;
    const totalTaxes = netTotal - totalItems;

    const totalLabel = `${netTotal < 0 ? '-' : ''}$${Math.abs(netTotal).toFixed(2)}`;

    return (
        <div className={cardClasses} onClick={onClick}>
            <h3 className={`text-lg font-bold mb-4 text-${color}-700`}>{title}</h3>
            <div>
                <p><strong>Store:</strong> {receipt.storeName}</p>
                {receipt.storeLocation && <p><strong>Location:</strong> {receipt.storeLocation}</p>}
                <p><strong>Date:</strong> {receipt.date}</p>
                <p className="flex items-center gap-2">
                    <strong>Total:</strong> {totalLabel}
                    <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${receipt.type === 'refund' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {receipt.type === 'refund' ? 'refund' : 'purchase'}
                    </span>
                </p>
                <hr className="my-3" />
                <p className="text-sm text-gray-600">Grocery Items - ${totalItems.toFixed(2)}</p>
                <p className="text-sm text-gray-600">Total Taxes - ${totalTaxes.toFixed(2)}</p>
                 <p className="text-xs text-gray-400 mt-4">Click to edit</p>
            </div>
        </div>
    );
};


// --- Main Duplicate Review Component ---
interface DuplicateReviewProps {
  receiptsToReview: Receipt[];
  allReceipts: Receipt[];
  onResolve: (action: 'merge' | 'keep' | 'delete' | 'keep_new', originalReceipt: Receipt, duplicateReceipt: Receipt) => void;
  onFinished: () => void;
  onEdit: (receipt: Receipt) => void;
  onResolveAll: (action: 'delete' | 'keep') => void;
}

const DuplicateReview: React.FC<DuplicateReviewProps> = ({ receiptsToReview, allReceipts, onResolve, onFinished, onEdit, onResolveAll }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [isBulkResolving, setIsBulkResolving] = useState(false);

  // Keep the index in range when the list shrinks after resolving
  React.useEffect(() => {
    if (receiptsToReview.length === 0) return;
    if (currentIndex >= receiptsToReview.length) {
      setCurrentIndex(Math.max(0, receiptsToReview.length - 1));
    }
  }, [receiptsToReview.length, currentIndex]);

  const receiptMap = useMemo(() => {
    const map = new Map<string, Receipt>();
    allReceipts.forEach(r => map.set(r.id, r));
    return map;
  }, [allReceipts]);

  if (receiptsToReview.length === 0) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold">No duplicates to review.</h2>
        <button onClick={onFinished} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
          Back to History
        </button>
      </div>
    );
  }

  const duplicate = receiptsToReview[currentIndex];
  const original = duplicate ? receiptMap.get(duplicate.originalReceiptId || '') : undefined;

  const goToNext = () => {
    if (currentIndex < receiptsToReview.length - 1) {
        setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
    }
  };

  const handleResolve = async (action: 'merge' | 'keep' | 'delete' | 'keep_new') => {
    if (isResolving) return;
    setIsResolving(true);
    if (!duplicate || !original) {
        const nextIndex = currentIndex + 1;
        if (nextIndex < receiptsToReview.length) {
            setCurrentIndex(nextIndex);
        } else {
            onFinished();
        }
        setIsResolving(false);
        return;
    }

    try {
        await onResolve(action, original, duplicate);
        const nextIndex = currentIndex + 1;
        if (nextIndex < receiptsToReview.length) {
            setCurrentIndex(nextIndex);
        } else {
            onFinished();
        }
    } finally {
        setIsResolving(false);
    }
  };

  const NavButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode}> = ({ onClick, disabled, children }) => (
        <button 
            onClick={onClick}
            disabled={disabled}
            className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
            {children}
        </button>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Review Potential Duplicates</h1>
          <p className="text-gray-500 mt-2">
            Comparing receipt {currentIndex + 1} of {receiptsToReview.length}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Previous Button */}
            <NavButton onClick={goToPrevious} disabled={currentIndex === 0}>
                <ArrowLeftIcon />
            </NavButton>
            
            {/* Receipt Details */}
            <div className="grid md:grid-cols-2 gap-8 flex-grow">
                <ReceiptDetails receipt={original} title="Original Receipt" color="green" onClick={() => original && onEdit(original)} />
                <ReceiptDetails receipt={duplicate} title="New (Potential Duplicate)" color="orange" onClick={() => onEdit(duplicate)} />
            </div>

            {/* Next Button */}
            <NavButton onClick={goToNext} disabled={currentIndex >= receiptsToReview.length - 1}>
                <ArrowRightIcon />
            </NavButton>
        </div>

        <div className="mt-8 p-6 bg-gray-50 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              disabled={isResolving}
              onClick={() => handleResolve('delete')}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-wait"
            >
              Keep Original, Delete New
            </button>
            <button
              disabled={isResolving}
              onClick={() => handleResolve('keep_new')}
              className="px-6 py-3 bg-amber-500 text-white font-bold rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-wait"
            >
              Keep New, Delete Original
            </button>
            <button
              disabled={isResolving}
              onClick={() => handleResolve('keep')}
              className="px-6 py-3 bg-gray-900 text-white font-bold rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-wait"
            >
              Keep Both
            </button>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-3">
          <button
            onClick={async () => {
              setIsBulkResolving(true);
              try {
                await onResolveAll('keep');
              } finally {
                setIsBulkResolving(false);
              }
            }}
            disabled={isBulkResolving}
            className="px-5 py-3 bg-gray-900 text-white text-sm font-bold rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-wait"
          >
            {isBulkResolving ? 'Working...' : 'Resolve All As Keep Original'}
          </button>
          <button
            onClick={async () => {
              setIsBulkResolving(true);
              try {
                await onResolveAll('delete');
              } finally {
                setIsBulkResolving(false);
              }
            }}
            disabled={isBulkResolving}
            className="px-5 py-3 bg-red-600 text-white text-sm font-bold rounded-lg w-full md:w-auto disabled:opacity-60 disabled:cursor-wait"
          >
            {isBulkResolving ? 'Working...' : 'Keep Originals, Delete Duplicates'}
          </button>
        </div>

        <div className="text-center mt-6">
            <button onClick={onFinished} className="text-gray-600 hover:text-gray-800 font-semibold">
                Finish Reviewing
            </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateReview;
