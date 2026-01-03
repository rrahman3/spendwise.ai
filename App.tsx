
import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { authService } from './services/authService';
import { dbService } from './services/dbService';
import * as geminiService from './services/geminiService';
import { Receipt, UserProfile, View } from './types';

// --- Component Imports ---
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ReceiptScanner from './components/ReceiptScanner';
import PurchaseHistory from './components/PurchaseHistory';
import AllItems from './components/AllItems';
import AIChat from './components/AIChat';
import CsvUploader from './components/CsvUploader';
import DuplicateReview from './components/DuplicateReview';
import EditModal from './components/EditModal';
import ProfilePage from './components/ProfilePage';

// --- SVG Icon Components ---
const SpendWiseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 7L12 12M12 22V12M22 7L12 12M12 12L17 9.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
);
const DashboardIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
);
const HistoryIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ItemsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
);
const ChatIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
);
const PlusIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
);

const App: React.FC = () => {
    // --- State Management ---
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [view, setView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [isFindingDuplicates, setIsFindingDuplicates] = useState(false);

    // CSV Processing State
    const [isCsvProcessing, setIsCsvProcessing] = useState(false);
    const [csvProgress, setCsvProgress] = useState(0);

    // Modal/Overlay State
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);

    // Derived State for pending reviews
    const receiptsToReview = receipts.filter(r => r.status === 'pending_review');
    const processedReceipts = receipts.filter(r => r.status !== 'pending_review');

    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                const profile: UserProfile = {
                    id: user.uid,
                    name: user.displayName || 'User',
                    email: user.email || '',
                    avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    isAuthenticated: true,
                    receiptCount: 0, // Will be updated on data load
                    totalSpent: 0,   // Will be updated on data load
                };
                setUserProfile(profile);
            } else {
                setUserProfile(null);
                 // On logout, redirect to the landing/login page
                setView('dashboard');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Data Fetching & Profile Update Effect ---
    const fetchReceipts = useCallback(async () => {
        if (!userProfile?.id) return;
        try {
            const userReceipts = await dbService.getReceipts(userProfile.id);
            setReceipts(userReceipts);
            
            const totalSpent = userReceipts
                .filter(r => r.status !== 'pending_review')
                .reduce((sum, r) => sum + r.total, 0);
            const receiptCount = userReceipts.filter(r => r.status !== 'pending_review').length;
            
            setUserProfile(prev => prev ? { ...prev, totalSpent, receiptCount } : null);
        } catch (e) {
            console.error("Failed to fetch receipts:", e);
            setError('Failed to fetch your receipt data. Please try again later.');
        }
    }, [userProfile?.id]);

    useEffect(() => {
        if (userProfile?.isAuthenticated) {
            fetchReceipts();
        } else {
            setReceipts([]); // Clear receipts on logout
        }
    }, [userProfile?.isAuthenticated, fetchReceipts]);


    // --- Core Handler Functions ---

    const handleLogin = async () => {
        try {
            await authService.signInWithGoogle();
            setView('dashboard');
        } catch (e) {
            console.error("Sign-in failed:", e);
            setError("Sign-in failed. Please try again.");
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        // The onAuthStateChanged listener will handle the userProfile state change
    };

    const handleFindAllDuplicates = async () => {
        if (!userProfile?.id) return;

        // Ask the user if they want to delete or flag
        const autoDelete = window.confirm("Do you want to automatically delete duplicate receipts?\n\n- Click 'OK' to DELETE the newer copy of any duplicates found.\n- Click 'Cancel' to FLAG them for manual review instead.");

        const action = autoDelete ? 'delete' : 'flag';
        
        const confirmationMessage = action === 'delete'
            ? "This will PERMANENTLY delete all but the oldest copy of any duplicate receipts. This action cannot be undone. Continue?"
            : "This will scan all processed receipts and flag any potential duplicates for review. This can be a slow process. Continue?";

        if (!window.confirm(confirmationMessage)) return;

        setIsFindingDuplicates(true);
        setError(null);
        try {
            const result = await dbService.findAndFlagDuplicates(userProfile.id, action);
            if (action === 'flag') {
                alert(`${result.found} new potential duplicates were found and are now ready for review.`);
            } else {
                alert(`${result.found} duplicate receipts were found and automatically deleted.`);
            }
            await fetchReceipts(); // Re-fetch to update data
        } catch (e) {
            console.error("Failed to find duplicates:", e);
            setError("An error occurred while scanning for duplicates.");
        } finally {
            setIsFindingDuplicates(false);
        }
    };

    const handleRecalculateHashes = async () => {
        if (!userProfile?.id) return;
        if (!window.confirm("This will recalculate the unique identifier for all your receipts. This is a safe operation but may take a moment. Continue?")) return;

        setIsBackfilling(true);
        setError(null);
        try {
            const result = await dbService.backfillHashes(userProfile.id);
            alert(`Recalculation complete! Scanned ${result.scanned} receipts and updated ${result.updated}.`);
            await fetchReceipts(); // Re-fetch to get updated data
        } catch (e) {
            console.error("Failed to backfill hashes:", e);
            setError("An error occurred during the recalculation process.");
        } finally {
            setIsBackfilling(false);
        }
    };

    const handleSaveReceipt = async (receiptData: Omit<Receipt, 'id'>) => {
        if (!userProfile?.id) return;
    
        const existingReceipt = await dbService.checkDuplicate(userProfile.id, receiptData as Receipt);
        let receiptToSave: Omit<Receipt, 'id'> = { ...receiptData, status: 'processed' };

        if (existingReceipt) {
            receiptToSave.status = 'pending_review';
            receiptToSave.originalReceiptId = existingReceipt.id;
        }

        await dbService.saveReceipt(userProfile.id, receiptToSave);
        await fetchReceipts(); // Refresh data from DB
    };
    
    const handleUpdateReceipt = async (receipt: Receipt) => {
        if (!userProfile?.id) return;
        await dbService.updateReceipt(userProfile.id, receipt);
        await fetchReceipts();
        setEditingReceipt(null); // Close modal on save
    };

    const handleDeleteReceipt = async (receiptId: string) => {
        if (!userProfile?.id) return;
        if (window.confirm("Are you sure you want to permanently delete this receipt?")) {
            await dbService.deleteReceipt(userProfile.id, receiptId);
            await fetchReceipts();
        }
    };

    const handleCsvUpload = async (file: File) => {
        if (!userProfile?.id) return;

        setIsCsvProcessing(true);
        setCsvProgress(0);

        try {
            const fileContent = await file.text();
            const extractedReceipts = await geminiService.extractReceiptsFromCsv(fileContent, (progress) => {
                setCsvProgress(progress);
            });

            // Process each extracted receipt individually for duplicate checking
            for (const extracted of extractedReceipts) {
                await handleSaveReceipt(extracted);
            }

            setView('history'); // Navigate to history after processing
        } catch (e) {
            console.error("CSV Processing failed:", e);
            setError("Failed to process the CSV file.");
        } finally {
            setIsCsvProcessing(false);
        }
    };

    const handleDuplicateResolve = async (action: 'merge' | 'keep' | 'delete', originalReceipt: Receipt, duplicateReceipt: Receipt) => {
        if (!userProfile?.id) return;

        switch (action) {
            case 'merge':
                const updatesForOriginal = { ...duplicateReceipt };
                delete updatesForOriginal.id; 
                delete updatesForOriginal.status;
                delete updatesForOriginal.originalReceiptId;

                await dbService.updateReceipt(userProfile.id, { ...originalReceipt, ...updatesForOriginal, status: 'processed' });
                await dbService.deleteReceipt(userProfile.id, duplicateReceipt.id);
                break;
            
            case 'keep':
                const receiptToKeep = { 
                    ...duplicateReceipt, 
                    status: 'processed', 
                    originalReceiptId: undefined
                };
                await dbService.updateReceipt(userProfile.id, receiptToKeep);
                break;

            case 'delete':
                await dbService.deleteReceipt(userProfile.id, duplicateReceipt.id);
                break;
        }

        await fetchReceipts();
    };

    // --- Render Logic ---

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-gray-100">Loading...</div>;
    }

    if (!userProfile?.isAuthenticated) {
        return <LandingPage onLogin={handleLogin} />;
    }

    const NavIcon: React.FC<{
      targetView: View;
      currentView: View;
      setView: (view: View) => void;
      children: React.ReactNode;
      }> = ({ targetView, currentView, setView, children }) => {
      const isActive = currentView === targetView;
      const classes = `flex items-center justify-center w-12 h-12 rounded-lg cursor-pointer ${
          isActive ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-200'
      }`;
      return (
          <button onClick={() => setView(targetView)} className={classes}>
              {children}
          </button>
      );
    };

    const renderCurrentView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard receipts={processedReceipts} onScanClick={() => setView('scan')} />;
            case 'scan':
                return <ReceiptScanner onReceiptProcessed={handleSaveReceipt} onFinished={() => setView('history')} />;
            case 'history':
                return <PurchaseHistory receipts={processedReceipts} onUpdateReceipt={setEditingReceipt} onDeleteReceipt={handleDeleteReceipt} onScanClick={() => setView('scan')} onReviewClick={() => setView('review')} receiptsToReviewCount={receiptsToReview.length} />;
            case 'items':
                return <AllItems receipts={receipts} onUpdateReceipt={setEditingReceipt} />;
            case 'chat':
                return <AIChat receipts={processedReceipts} />;
            case 'upload':
                return <CsvUploader onFileUpload={handleCsvUpload} isProcessing={isCsvProcessing} progress={csvProgress} />;
            case 'review':
                return <DuplicateReview receiptsToReview={receiptsToReview} allReceipts={receipts} onResolve={handleDuplicateResolve} onFinished={() => setView('history')} onEdit={setEditingReceipt} />;
            case 'profile':
                return <ProfilePage userProfile={userProfile} onLogout={handleLogout} onNavigate={setView} reviewCount={receiptsToReview.length} onRecalculateHashes={handleRecalculateHashes} isBackfilling={isBackfilling} onFindAllDuplicates={handleFindAllDuplicates} isFindingDuplicates={isFindingDuplicates} />;
            default:
                setView('dashboard');
                return null;
        }
    };

    return (
      <div className="flex h-screen bg-white font-sans">
        {/* Sidebar */}
        <aside className="w-20 flex flex-col items-center bg-white border-r border-gray-200 py-4">
            <div className="w-12 h-12 flex items-center justify-center text-blue-600 cursor-pointer" onClick={() => setView('dashboard')}>
                <SpendWiseIcon />
            </div>
            <nav className="flex flex-col items-center space-y-4 mt-10">
                <NavIcon targetView="dashboard" currentView={view} setView={setView}><DashboardIcon /></NavIcon>
                <NavIcon targetView="history" currentView={view} setView={setView}><HistoryIcon /></NavIcon>
                <NavIcon targetView="items" currentView={view} setView={setView}><ItemsIcon /></NavIcon>
                <NavIcon targetView="chat" currentView={view} setView={setView}><ChatIcon /></NavIcon>
            </nav>
            <div className="mt-auto">
                <button onClick={() => setView('scan')} className="w-14 h-14 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <PlusIcon />
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
            <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
                <div className="flex-1">
                    {/* This can be used for a dynamic header title based on view */}
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => setView('scan')} className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200">
                        + Quick Scan
                    </button>
                    <div className="relative">
                         <button onClick={() => setView('profile')} className="block w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 hover:border-blue-500 focus:outline-none focus:border-blue-500">
                            <img className="w-full h-full object-cover" src={userProfile.avatar} alt="User Avatar" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
                {error && (
                    <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        <span className="font-medium">Error:</span> {error}
                        <button onClick={() => setError(null)} className="ml-4 font-bold">X</button>
                    </div>
                )}
                {renderCurrentView()}
            </main>
        </div>

        {/* Modal */}
        {editingReceipt && (
            <EditModal
                receipt={editingReceipt}
                onSave={handleUpdateReceipt}
                onClose={() => setEditingReceipt(null)}
            />
        )}
    </div>
  );
};

export default App;
