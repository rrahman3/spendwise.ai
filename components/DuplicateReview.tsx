
import React, { useState, useMemo } from 'react';
import { Receipt } from '../types';

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

    const totalItems = receipt.items?.reduce((sum, item) => sum + item.price, 0) || 0;
    const totalTaxes = receipt.total - totalItems;

    return (
        <div className={cardClasses} onClick={onClick}>
            <h3 className={`text-lg font-bold mb-4 text-${color}-700`}>{title}</h3>
            <div>
                <p><strong>Store:</strong> {receipt.storeName}</p>
                <p><strong>Date:</strong> {receipt.date}</p>
                <p><strong>Total:</strong> ${receipt.total.toFixed(2)}</p>
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
  onResolve: (action: 'merge' | 'keep' | 'delete', originalReceipt: Receipt, duplicateReceipt: Receipt) => void;
  onFinished: () => void;
  onEdit: (receipt: Receipt) => void;
}

const DuplicateReview: React.FC<DuplicateReviewProps> = ({ receiptsToReview, allReceipts, onResolve, onFinished, onEdit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const original = receiptMap.get(duplicate.originalReceiptId || '');

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

  const handleResolve = (action: 'merge' | 'keep' | 'delete') => {
    if (original) {
      onResolve(action, original, duplicate);
      // After resolving, if it was the last one, finish. Otherwise, go to the next one.
      if (currentIndex >= receiptsToReview.length - 1) {
          onFinished();
      } 
    } else {
        alert("Error: The original receipt could not be found. Cannot resolve this duplicate.");
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
            <button onClick={() => handleResolve('merge')} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg w-full md:w-auto">
              Merge & Keep Original
            </button>
            <button onClick={() => handleResolve('keep')} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg w-full md:w-auto">
              Keep Both (Not a Duplicate)
            </button>
            <button onClick={() => handleResolve('delete')} className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg w-full md:w-auto">
              Delete New Receipt
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
