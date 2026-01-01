
import React, { useState, useEffect } from 'react';
import { View, Receipt, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import ReceiptScanner from './components/ReceiptScanner';
import PurchaseHistory from './components/PurchaseHistory';
import AIChat from './components/AIChat';
import Login from './components/Login';
import AllItems from './components/AllItems';
import { authService } from './services/authService';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize App: Check for existing session
  useEffect(() => {
    const initApp = async () => {
      const savedProfile = localStorage.getItem('spendwise_profile');
      if (savedProfile) {
        const user = JSON.parse(savedProfile);
        setProfile(user);
        const data = await dbService.getReceipts(user.id);
        setReceipts(data);
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Sync user profile stats whenever receipts change
  useEffect(() => {
    if (profile && receipts.length >= 0) {
      const total = receipts.reduce((sum, r) => sum + r.total, 0);
      if (profile.totalSpent !== total || profile.receiptCount !== receipts.length) {
        const updatedProfile = { ...profile, totalSpent: total, receiptCount: receipts.length };
        setProfile(updatedProfile);
        localStorage.setItem('spendwise_profile', JSON.stringify(updatedProfile));
      }
    }
  }, [receipts]);

  const handleLogin = async () => {
    try {
      const user = await authService.signInWithGoogle();
      setProfile(user);
      localStorage.setItem('spendwise_profile', JSON.stringify(user));
      const data = await dbService.getReceipts(user.id);
      setReceipts(data);
      setView('dashboard');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setProfile(null);
    setReceipts([]);
    setView('dashboard');
  };

  const handleReceiptProcessed = async (newReceipt: Receipt) => {
    if (!profile) return;

    // Check for duplicate
    const isDuplicate = await dbService.checkDuplicate(profile.id, newReceipt);
    if (isDuplicate) {
      const confirmSave = window.confirm(
        `Possible Duplicate Detected!\n\nA receipt from ${newReceipt.storeName} on ${newReceipt.date} for $${newReceipt.total.toFixed(2)} already exists.\n\nDo you still want to save it?`
      );
      if (!confirmSave) return;
    }

    await dbService.saveReceipt(profile.id, newReceipt);
    setReceipts(prev => [newReceipt, ...prev]);
  };

  const handleReceiptUpdated = async (updated: Receipt) => {
    if (!profile) return;
    await dbService.updateReceipt(profile.id, updated);
    setReceipts(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleReceiptDeleted = async (receiptId: string) => {
    if (!profile) return;
    await dbService.deleteReceipt(profile.id, receiptId);
    setReceipts(prev => prev.filter(r => r.id !== receiptId));
  };

  const handleBatchFinished = () => {
    setView('history');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile?.isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    {
      id: 'dashboard', label: 'Home', icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'history', label: 'History', icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'scan', label: 'Scan', icon: (
        <div className="bg-blue-600 p-3 rounded-full shadow-lg shadow-blue-200 text-white transition-transform active:scale-90 ring-4 ring-white">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      )
    },
    {
      id: 'items', label: 'Items', icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'chat', label: 'AI', icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
  ];

  const handleScanClick = () => setView('scan');

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 pb-28 lg:pb-0 lg:pl-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">SpendWise<span className="text-blue-600">AI</span></h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleScanClick}
              className="hidden sm:flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Quick Scan</span>
            </button>
            <button
              onClick={() => setView('profile')}
              className="relative focus:outline-none group"
            >
              <img src={profile.avatar} alt="Profile" className="w-10 h-10 rounded-xl border-2 border-white shadow-sm transition-transform group-hover:scale-105" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && <Dashboard receipts={receipts} onScanClick={handleScanClick} />}
        {view === 'scan' && <ReceiptScanner onReceiptProcessed={handleReceiptProcessed} onFinished={handleBatchFinished} />}
        {view === 'history' && <PurchaseHistory receipts={receipts} onScanClick={handleScanClick} onUpdateReceipt={handleReceiptUpdated} onDeleteReceipt={handleReceiptDeleted} />}
        {view === 'items' && <AllItems receipts={receipts} onUpdateReceipt={handleReceiptUpdated} />}
        {view === 'chat' && <AIChat receipts={receipts} />}
        {view === 'profile' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <img src={profile.avatar} alt="Big Profile" className="w-32 h-32 rounded-[2rem] border-4 border-blue-50 shadow-lg" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900">{profile.name}</h2>
                  <p className="text-gray-400 font-medium">{profile.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Scans</p>
                    <p className="text-3xl font-black text-gray-900">{profile.receiptCount}</p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Tracked</p>
                    <p className="text-3xl font-black text-blue-600">${profile.totalSpent.toFixed(2)}</p>
                  </div>
                </div>
                <div className="w-full space-y-3 pt-4">
                  <button
                    onClick={handleLogout}
                    className="w-full py-4 px-6 bg-white hover:bg-red-50 text-red-600 font-bold rounded-2xl transition-all border border-red-100 active:scale-95"
                  >
                    Logout Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-4 flex justify-between items-end z-50 lg:hidden shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`flex flex-col items-center justify-center space-y-1 transition-all ${view === item.id ? 'text-blue-600 scale-105' : 'text-gray-400'
              } ${item.id === 'scan' ? 'translate-y-[-12px]' : ''}`}
          >
            {item.icon}
            {item.id !== 'scan' && <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>}
          </button>
        ))}
      </nav>

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-24 bg-white border-r border-gray-100 flex-col items-center py-10 space-y-8 z-30">
        <div className="mb-8" onClick={() => setView('dashboard')}>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center cursor-pointer shadow-lg shadow-blue-100">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
        </div>
        {navItems.filter(i => i.id !== 'scan').map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`p-4 rounded-2xl transition-all relative group ${view === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
          >
            {item.icon}
            <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
            </span>
          </button>
        ))}
        <div className="flex-1"></div>
        <button
          onClick={handleScanClick}
          className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-200 hover:scale-110 transition-transform active:scale-95"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </aside>
    </div>
  );
};

export default App;
