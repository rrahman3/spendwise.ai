
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User, getIdTokenResult } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { authService } from './services/authService';
import { dbService } from './services/dbService';
import * as geminiService from './services/geminiService';
import { Receipt, UserProfile, View } from './types';
import { db } from './services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getReceiptNetTotal, withNormalizedTotal } from './services/totals';

// --- Component Imports ---
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ReceiptScanner from './components/ReceiptScanner';
import PurchaseHistory from './components/PurchaseHistory';
import AllItems from './components/AllItems';
import StoresView from './components/StoresView';
import AIChat from './components/AIChat';
import CsvUploader from './components/CsvUploader';
import DuplicateReview from './components/DuplicateReview';
import EditModal from './components/EditModal';
import ProfilePage from './components/ProfilePage';
import ReceiptViewModal from './components/ReceiptViewModal';

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
const StoreIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l1-5h16l1 5M4 9h16v11H4V9zm4 11v-4a2 2 0 012-2h4a2 2 0 012 2v4" /></svg>
);

const App: React.FC = () => {
    const resolvePlanForUser = useCallback(async (userId: string): Promise<'free' | 'pro'> => {
        try {
            const usageDoc = await getDoc(doc(db, "users", userId, "usage", "current"));
            const rootDoc = await getDoc(doc(db, "users", userId));
            const planRaw = usageDoc.exists() ? (usageDoc.data() as any)?.plan : (rootDoc.exists() ? (rootDoc.data() as any)?.plan : undefined);
            const normalized = typeof planRaw === "string" ? planRaw.trim().toLowerCase() : undefined;
            return normalized === "pro" ? "pro" : "free";
        } catch (e) {
            console.error("Failed to resolve plan", e);
            return "free";
        }
    }, []);
    // --- State Management ---
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [view, setView] = useState<View>('dashboard');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFindingDuplicates, setIsFindingDuplicates] = useState(false);
    const [isRescanningAll, setIsRescanningAll] = useState(false);
    const [rescanProgress, setRescanProgress] = useState(0);
    const [rescanTotal, setRescanTotal] = useState(0);
    const [rescanCompleted, setRescanCompleted] = useState(0);

    // CSV Processing State
    const [isCsvProcessing, setIsCsvProcessing] = useState(false);
    const [csvProgress, setCsvProgress] = useState(0);

    // Modal/Overlay State
    const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);

    // Derived State for pending reviews
    const activeReceipts = receipts.filter(r => r.status !== 'deleted');
    const receiptsToReview = activeReceipts.filter(r => r.status === 'pending_review');
    const processedReceipts = activeReceipts; // include pending_review so flagged receipts stay visible
    const { dailyCount, monthlyCount } = useMemo(() => {
        const now = new Date();
        const daily = processedReceipts.filter(r => {
            const d = new Date(r.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }).length;
        const monthly = processedReceipts.filter(r => {
            const d = new Date(r.createdAt);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
        return { dailyCount: daily, monthlyCount: monthly };
    }, [processedReceipts]);

    const imageUrlToBase64 = async (url: string): Promise<string | null> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const data = reader.result as string;
                    resolve(data?.split(',')[1] ?? null);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.error("Failed to fetch image", err);
            return null;
        }
    };

    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                let plan: 'free' | 'pro' = 'free';
                try {
                    const token = await getIdTokenResult(user);
                    plan = (token.claims as any)?.plan === 'pro' ? 'pro' : 'free';
                } catch (err) {
                    console.warn("Failed to read plan from token", err);
                }
                // Resolve plan from Firestore usage/root docs to override token if needed
                const planFromFirestore = await resolvePlanForUser(user.uid);
                if (planFromFirestore === 'pro') {
                    plan = 'pro';
                }
                const profile: UserProfile = {
                    id: user.uid,
                    name: user.displayName || 'User',
                    email: user.email || '',
                    avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    isAuthenticated: true,
                    receiptCount: 0, // Will be updated on data load
                    totalSpent: 0,   // Will be updated on data load
                    plan,
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
            const pageSize = 100;
            let nextPageToken: string | undefined;
            let allReceipts: Receipt[] = [];
            let safety = 0;

            do {
                const { receipts: page, nextPageToken: nextToken } = await dbService.getReceipts(userProfile.id, {
                    pageSize,
                    pageToken: nextPageToken,
                });
                allReceipts = allReceipts.concat(page);
                nextPageToken = nextToken ?? undefined;
                safety++;
            } while (nextPageToken && safety < 100);

            const normalizedReceipts = allReceipts.map(withNormalizedTotal);
            setReceipts(normalizedReceipts);
            
            const totalSpentRaw = normalizedReceipts
                .filter(r => r.status === 'processed')
                .reduce((sum, r) => sum + getReceiptNetTotal(r), 0);
            const totalSpent = Number(totalSpentRaw.toFixed(2));
            const receiptCount = normalizedReceipts.filter(r => r.status === 'processed').length;

            // Also refresh plan from usage/root doc to keep profile in sync
            let usagePlan: 'free' | 'pro' | undefined;
            try {
                const usageDoc = await getDoc(doc(db, "users", userProfile.id, "usage", "current"));
                const rootDoc = await getDoc(doc(db, "users", userProfile.id));
                const planRaw = usageDoc.exists() ? (usageDoc.data() as any)?.plan : (rootDoc.exists() ? (rootDoc.data() as any)?.plan : undefined);
                const normalized = typeof planRaw === "string" ? planRaw.trim().toLowerCase() : undefined;
                if (normalized === "pro") usagePlan = "pro";
            } catch (planErr) {
                console.warn("Unable to refresh plan", planErr);
            }

            setUserProfile(prev => prev ? { ...prev, totalSpent, receiptCount, plan: usagePlan ?? prev.plan } : null);
        } catch (e) {
            console.error("Failed to fetch receipts:", e);
            setError('Failed to fetch your receipt data. Please try again later.');
        }
    }, [userProfile?.id]);

    const fetchPlan = useCallback(async () => {
        if (!userProfile?.id) return;
        try {
            const usageDoc = await getDoc(doc(db, "users", userProfile.id, "usage", "current"));
            const rootDoc = await getDoc(doc(db, "users", userProfile.id));
            const planRaw = usageDoc.exists() ? (usageDoc.data() as any)?.plan : (rootDoc.exists() ? (rootDoc.data() as any)?.plan : undefined);
            const normalized = typeof planRaw === "string" ? planRaw.trim().toLowerCase() : undefined;
            const usagePlan = normalized === "pro" ? "pro" : undefined;
            const nextPlan = usagePlan ?? (userProfile.plan === "pro" ? "pro" : "free");
            setUserProfile(prev => prev ? { ...prev, plan: nextPlan } : null);
        } catch (e) {
            console.error("Failed to fetch plan:", e);
        }
    }, [userProfile?.id]);

    useEffect(() => {
        if (userProfile?.isAuthenticated) {
            fetchReceipts();
            fetchPlan();
        } else {
            setReceipts([]); // Clear receipts on logout
        }
    }, [userProfile?.isAuthenticated, fetchReceipts, fetchPlan]);


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

        // Always flag for manual review (no auto-delete path)
        const confirmationMessage = "This will scan all processed receipts and flag any potential duplicates for review. This can be a slow process. Continue?";
        if (!window.confirm(confirmationMessage)) return;

        setIsFindingDuplicates(true);
        setError(null);
        try {
            const result = await dbService.findAndFlagDuplicates(userProfile.id, 'flag');
            alert(`${result.found} new potential duplicates were found and are now ready for review.`);
            await fetchReceipts(); // Re-fetch to update data
        } catch (e) {
            console.error("Failed to find duplicates:", e);
            setError("An error occurred while scanning for duplicates.");
        } finally {
            setIsFindingDuplicates(false);
        }
    };

    const handleRescanAllReceipts = async () => {
        if (!userProfile?.id) return;
        if (!window.confirm("This will rescan every receipt image with AI and overwrite extracted fields when new values are found. Continue?")) return;

        setIsRescanningAll(true);
        const receiptsToRescan = processedReceipts.filter(r => !!r.imageUrl);
        setRescanTotal(receiptsToRescan.length);
        setRescanCompleted(0);
        setRescanProgress(0);
        setError(null);
        let limitHit = false;
        try {
            for (let idx = 0; idx < receiptsToRescan.length; idx++) {
                const receipt = receiptsToRescan[idx];
                if (!receipt.imageUrl) continue;
                let base64 = receipt.imageUrl.startsWith('data:') ? receipt.imageUrl.split(',')[1] : null;
                if (!base64) {
                    base64 = await imageUrlToBase64(receipt.imageUrl);
                }
                if (!base64) continue;

                let extracted;
                try {
                    extracted = await geminiService.extractReceiptData(base64);
                } catch (err: any) {
                    const code = err?.code || err?.message || '';
                    const isLimit = typeof code === 'string' && code.toLowerCase().includes('resource-exhausted');
                    if (isLimit) {
                        const message = 'Scan limit reached for your plan. Please upgrade to continue.';
                        setError(message);
                        limitHit = true;
                        break;
                    }
                    throw err;
                }

                const merged: Receipt = {
                    ...receipt,
                    storeName: extracted.storeName ?? receipt.storeName,
                    storeLocation: extracted.storeLocation ?? receipt.storeLocation,
                    date: extracted.date ?? receipt.date,
                    time: extracted.time ?? receipt.time,
                    total: extracted.total ?? receipt.total,
                    currency: extracted.currency ?? receipt.currency,
                    items: extracted.items ?? receipt.items,
                    type: extracted.type ?? receipt.type,
                };
                await dbService.updateReceipt(userProfile.id, merged);
                const completed = idx + 1;
                setRescanCompleted(completed);
                setRescanProgress(Math.round((completed / receiptsToRescan.length) * 100));
            }
            if (!limitHit) {
                await fetchReceipts();
                alert("Rescan complete. Latest AI extraction applied to all receipts with images.");
            } else {
                alert("Rescan stopped: scan limit reached for your plan.");
            }
        } catch (e) {
            console.error("Failed to rescan all receipts:", e);
            setError("An error occurred while rescanning receipts.");
        } finally {
            setIsRescanningAll(false);
            setTimeout(() => {
                setRescanProgress(0);
                setRescanTotal(0);
                setRescanCompleted(0);
            }, 1500);
        }
    };

    const handleSaveReceipt = async (receiptData: Omit<Receipt, 'id'>) => {
        if (!userProfile?.id) return;

        const existingReceipt = await dbService.checkDuplicate(userProfile.id, receiptData as Receipt);
        let receiptToSave: Omit<Receipt, 'id'> = { ...withNormalizedTotal(receiptData), status: 'processed' };

        if (existingReceipt) {
            receiptToSave.status = 'pending_review';
            receiptToSave.originalReceiptId = existingReceipt.id;
        }

        await dbService.saveReceipt(userProfile.id, receiptToSave);
        await fetchReceipts(); // Refresh data from DB
    };
    
    const handleUpdateReceipt = async (receipt: Receipt) => {
        if (!userProfile?.id) return;
        await dbService.updateReceipt(userProfile.id, withNormalizedTotal(receipt));
        await fetchReceipts();
        setEditingReceipt(null); // Close modal on save
    };

    const handleDeleteReceipt = async (receiptId: string, opts?: { skipConfirm?: boolean }) => {
        if (!userProfile?.id) return;
        if (opts?.skipConfirm || window.confirm("Are you sure you want to permanently delete this receipt?")) {
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

    const handleDuplicateResolve = async (action: 'merge' | 'keep' | 'delete' | 'keep_new', originalReceipt: Receipt, duplicateReceipt: Receipt) => {
        if (!userProfile?.id) return;

        switch (action) {
            case 'merge':
                const updatesForOriginal = { ...withNormalizedTotal(duplicateReceipt) };
                delete updatesForOriginal.id; 
                delete updatesForOriginal.status;
                delete updatesForOriginal.originalReceiptId;

                await dbService.updateReceipt(userProfile.id, withNormalizedTotal({ ...originalReceipt, ...updatesForOriginal, status: 'processed' }));
                await dbService.deleteReceipt(userProfile.id, duplicateReceipt.id);
                break;
            
            case 'keep':
                const receiptToKeep = withNormalizedTotal({ 
                    ...duplicateReceipt, 
                    status: 'processed', 
                    originalReceiptId: undefined
                });
                await dbService.updateReceipt(userProfile.id, receiptToKeep);
                break;

            case 'delete':
                await dbService.deleteReceipt(userProfile.id, duplicateReceipt.id);
                break;

            case 'keep_new':
                // Keep the newer receipt and remove the original
                const cleanedNew = withNormalizedTotal({
                    ...duplicateReceipt,
                    status: 'processed',
                    originalReceiptId: undefined
                });
                await dbService.updateReceipt(userProfile.id, cleanedNew);
                await dbService.deleteReceipt(userProfile.id, originalReceipt.id);
                break;
        }

        await fetchReceipts();
    };

    const handleResolveAllDuplicates = async (action: 'keep' | 'delete') => {
        if (!userProfile?.id) return;
        const confirmations: Record<typeof action, string> = {
            keep: "Mark all pending duplicates as not duplicates and keep originals?",
            delete: "Delete all pending duplicate receipts (newer copies)?",
        };
        if (!window.confirm(confirmations[action])) return;

        const targets = receiptsToReview;
        for (const dup of targets) {
            const original = receipts.find(r => r.id === dup.originalReceiptId);
            if (!original) continue;
            if (action === 'keep') {
                const receiptToKeep = withNormalizedTotal({ 
                    ...dup, 
                    status: 'processed', 
                    originalReceiptId: undefined
                });
                await dbService.updateReceipt(userProfile.id, receiptToKeep);
            } else {
                await dbService.deleteReceipt(userProfile.id, dup.id);
            }
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
      const classes = `flex items-center justify-center w-12 h-12 rounded-2xl cursor-pointer transition-all ${
          isActive
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]'
              : 'text-gray-500 hover:bg-gray-100 hover:shadow-sm'
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
                return <Dashboard
                    receipts={processedReceipts}
                    onScanClick={() => setView('scan')}
                    onReceiptOpen={(id) => {
                        const found = receipts.find(r => r.id === id);
                        if (found) setViewingReceipt(found);
                    }}
                />;
            case 'scan':
                return <ReceiptScanner onReceiptProcessed={handleSaveReceipt} onFinished={() => setView('history')} userId={userProfile?.id} />;
            case 'history':
                return <PurchaseHistory receipts={processedReceipts} onUpdateReceipt={setEditingReceipt} onDeleteReceipt={handleDeleteReceipt} onScanClick={() => setView('scan')} onReviewClick={() => setView('review')} receiptsToReviewCount={receiptsToReview.length} />;
            case 'items':
                return <AllItems receipts={processedReceipts} onUpdateReceipt={handleUpdateReceipt} />;
            case 'stores':
                return <StoresView receipts={processedReceipts} onEditReceipt={setEditingReceipt} onDeleteReceipt={handleDeleteReceipt} />;
            case 'chat':
                return <AIChat receipts={processedReceipts} />;
            case 'upload':
                return <CsvUploader onFileUpload={handleCsvUpload} isProcessing={isCsvProcessing} progress={csvProgress} />;
            case 'review':
                return <DuplicateReview receiptsToReview={receiptsToReview} allReceipts={receipts} onResolve={handleDuplicateResolve} onFinished={() => setView('history')} onEdit={setEditingReceipt} onResolveAll={handleResolveAllDuplicates} />;
            case 'profile':
                return <ProfilePage
                    userProfile={userProfile}
                    onLogout={handleLogout}
                    onNavigate={setView}
                    reviewCount={receiptsToReview.length}
                    onFindAllDuplicates={handleFindAllDuplicates}
                    isFindingDuplicates={isFindingDuplicates}
                    onRescanAllReceipts={handleRescanAllReceipts}
                    isRescanningAll={isRescanningAll}
                    rescanProgress={rescanProgress}
                    rescanCompleted={rescanCompleted}
                    rescanTotal={rescanTotal}
                    dailyCount={dailyCount}
                    monthlyCount={monthlyCount}
                />;
            default:
                setView('dashboard');
                return null;
        }
    };

    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-white font-sans">
        {/* Sidebar / Bottom Nav */}
        <aside className="fixed bottom-0 left-0 right-0 md:static w-full md:w-20 flex md:flex-col bg-white border-t md:border-t-0 md:border-r border-gray-200 px-6 py-3 md:py-4 z-20 md:min-h-screen">
            <div className="hidden md:flex w-12 h-12 items-center justify-center text-blue-600 cursor-pointer" onClick={() => setView('dashboard')}>
                <SpendWiseIcon />
            </div>
            <div className="flex w-full items-center justify-between md:flex-col md:items-center md:space-y-6">
                <nav className="flex flex-1 justify-between md:flex-col md:items-center md:space-y-4">
                    <NavIcon targetView="dashboard" currentView={view} setView={setView}><DashboardIcon /></NavIcon>
                <NavIcon targetView="history" currentView={view} setView={setView}><HistoryIcon /></NavIcon>
                <NavIcon targetView="stores" currentView={view} setView={setView}><StoreIcon /></NavIcon>
                <NavIcon targetView="items" currentView={view} setView={setView}><ItemsIcon /></NavIcon>
                <NavIcon targetView="chat" currentView={view} setView={setView}><ChatIcon /></NavIcon>
            </nav>
            <div className="md:mt-auto md:pt-2">
                    <button onClick={() => setView('scan')} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <PlusIcon />
                    </button>
                </div>
            </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col pb-20 md:pb-0 min-h-0">
            <header className="w-full max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3 px-4 md:px-8 py-3 md:py-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                        <SpendWiseIcon />
                    </div>
                    <div className="leading-tight">
                        <p className="text-sm font-bold text-gray-900">SpendWiseAI</p>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Trusted receipts</p>
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-3 ml-auto justify-end w-full sm:w-auto">
                    <button onClick={() => setView('scan')} className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200">
                        + Quick Scan
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                    >
                        Logout
                    </button>
                    <div className="relative">
                         <button onClick={() => setView('profile')} className="block w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 hover:border-blue-500 focus:outline-none focus:border-blue-500">
                            <img className="w-full h-full object-cover" src={userProfile.avatar} alt="User Avatar" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-28 md:pb-8 w-full max-w-6xl mx-auto min-h-0">
                {error && (
                    <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        <span className="font-medium">Error:</span> {error}
                        <button onClick={() => setError(null)} className="ml-4 font-bold">X</button>
                    </div>
                )}
                {isRescanningAll && rescanTotal > 0 && (
                    <div className="p-4 mb-4 rounded-2xl border border-blue-100 bg-white shadow-md">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Rescanning receipts</p>
                                <p className="text-sm font-semibold text-gray-700">{rescanCompleted} of {rescanTotal} processed</p>
                            </div>
                            <span className="text-xs font-semibold text-blue-600">{rescanProgress}%</span>
                        </div>
                        <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                                style={{ width: `${rescanProgress}%` }}
                            />
                        </div>
                    </div>
                )}
                {renderCurrentView()}
            </main>
            <footer className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-4 pb-20 md:pb-4 border-t border-gray-200 bg-white text-xs text-gray-500 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <SpendWiseIcon />
                    </div>
                    <span>SpendWiseAI - Secured by Firebase</span>
                </div>
                <span>&copy; 2026 SpendWiseAI. All rights reserved.</span>
            </footer>
        </div>

        {/* Modal */}
        {editingReceipt && (
            <EditModal
                receipt={editingReceipt}
                onSave={handleUpdateReceipt}
                onClose={() => setEditingReceipt(null)}
                userId={userProfile?.id}
            />
        )}
        {viewingReceipt && (
            <ReceiptViewModal
                receipt={viewingReceipt}
                onClose={() => setViewingReceipt(null)}
                onEdit={() => {
                    setEditingReceipt(viewingReceipt);
                    setViewingReceipt(null);
                }}
                onDelete={(id) => {
                    if (window.confirm("Delete this receipt? This cannot be undone.")) {
                        handleDeleteReceipt(id, { skipConfirm: true });
                        setViewingReceipt(null);
                    }
                }}
            />
        )}
    </div>
  );
};

export default App;
