
import React from 'react';
import { UserProfile, View } from '../types';

interface ProfilePageProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  reviewCount: number;
  onFindAllDuplicates: () => void;
  isFindingDuplicates: boolean;
  onRescanAllReceipts: () => void;
  isRescanningAll: boolean;
  rescanProgress?: number;
  rescanCompleted?: number;
  rescanTotal?: number;
  dailyCount?: number;
  monthlyCount?: number;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onLogout, onNavigate, reviewCount, onFindAllDuplicates, isFindingDuplicates, onRescanAllReceipts, isRescanningAll, rescanProgress = 0, rescanCompleted = 0, rescanTotal = 0, dailyCount = 0, monthlyCount = 0 }) => {
  const plan = userProfile.plan ?? 'free';
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero / Identity */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%)]" />
        <div className="relative flex items-center gap-6 p-8 flex-wrap">
          <img
            src={userProfile.avatar}
            alt="User Avatar"
            className="w-20 h-20 rounded-2xl border-4 border-white/70 shadow-2xl"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Profile</p>
            <h2 className="text-3xl font-black leading-tight">{userProfile.name}</h2>
            <p className="text-white/80">{userProfile.email}</p>
          </div>
        </div>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Receipts</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{userProfile.receiptCount}</p>
          <p className="text-xs text-gray-500 mt-1">Processed receipts only</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Total Tracked</p>
          <p className="text-3xl font-black text-gray-900 mt-2">${userProfile.totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Plan</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{plan.toUpperCase()}</p>
          <p className="text-xs text-gray-500 mt-1">Limits enforced on the server for accuracy.</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Usage</p>
          <p className="text-xl font-black text-gray-900 mt-2">{dailyCount} scans today</p>
          <p className="text-xs text-gray-500 mt-1">{monthlyCount} scans this month</p>
        </div>
      </div>

      {/* Data Health actions */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Data Health</p>
            <h3 className="text-xl font-black text-gray-900">Keep your ledger clean and deduped</h3>
            <p className="text-sm text-gray-500">Run integrity checks when you ingest lots of receipts or notice mismatches.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">Review queue</h4>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${reviewCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {reviewCount > 0 ? `${reviewCount} waiting` : 'Clear'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Resolve flagged duplicates and confirm originals.</p>
            <button
              onClick={() => onNavigate('review')}
              disabled={reviewCount === 0}
              className="mt-3 w-full justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open review
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">Duplicate scan</h4>
              {isFindingDuplicates ? (
                <span className="text-xs font-semibold text-blue-600">Scanning...</span>
              ) : (
                <span className="text-xs font-semibold text-gray-400">On demand</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Sweep all processed receipts and flag any lookalikes.</p>
            <button
              onClick={onFindAllDuplicates}
              disabled={isFindingDuplicates}
              className="mt-3 w-full justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait"
            >
              {isFindingDuplicates ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37258 0 0 5.37258 0 12h4z"></path></svg>
                  Running
                </>
              ) : (
                <>
                  Run scan
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </>
              )}
            </button>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900">Rescan all receipts</h4>
              {isRescanningAll ? (
                <span className="text-xs font-semibold text-blue-600">Running...</span>
              ) : (
                <span className="text-xs font-semibold text-gray-400">AI refresh</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Re-run AI extraction on every stored receipt image.</p>
            {isRescanningAll && rescanTotal > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>{rescanCompleted} of {rescanTotal}</span>
                  <span className="text-blue-600">{rescanProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                    style={{ width: `${rescanProgress}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={onRescanAllReceipts}
              disabled={isRescanningAll}
              className="mt-3 w-full justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait"
            >
              {isRescanningAll ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37258 0 0 5.37258 0 12h4z"></path></svg>
                  Rescanning
                </>
              ) : (
                <>
                  Rescan all
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
