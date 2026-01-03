
import React from 'react';
import { UserProfile, View } from '../types';

interface ProfilePageProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  reviewCount: number;
  onRecalculateHashes: () => void;
  isBackfilling: boolean;
  onFindAllDuplicates: () => void;
  isFindingDuplicates: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userProfile, onLogout, onNavigate, reviewCount, onRecalculateHashes, isBackfilling, onFindAllDuplicates, isFindingDuplicates }) => {
  return (
    <div className="max-w-3xl mx-auto">
      {/* User Info Card */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-6">
        <img
          src={userProfile.avatar}
          alt="User Avatar"
          className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
        />
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{userProfile.name}</h2>
          <p className="text-gray-500">{userProfile.email}</p>
        </div>
      </div>

      {/* Action List */}
      <div className="mt-8 space-y-4">
        <h3 className="px-4 text-lg font-semibold text-gray-800">Settings & Actions</h3>

        {/* Review Duplicates Action */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => onNavigate('review')}
            className="w-full text-left flex justify-between items-center p-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={reviewCount === 0}
          >
            <div>
              <p className="font-semibold text-gray-800">Review Duplicates</p>
              <p className="text-sm text-gray-500">Merge or manage duplicate receipt entries to keep your records clean.</p>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${reviewCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
              {reviewCount}
            </span>
          </button>
        </div>

        {/* Find All Duplicates Action */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={onFindAllDuplicates}
            className="w-full text-left flex justify-between items-center p-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
            disabled={isFindingDuplicates}
          >
            <div>
              <p className="font-semibold text-gray-800">Find All Duplicates</p>
              <p className="text-sm text-gray-500">Scan all processed receipts and flag any potential duplicates for review.</p>
            </div>
            {isFindingDuplicates ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </button>
        </div>

        {/* Recalculate Hashes Action */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={onRecalculateHashes}
            className="w-full text-left flex justify-between items-center p-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait"
            disabled={isBackfilling}
          >
            <div>
              <p className="font-semibold text-gray-800">Recalculate Hashes</p>
              <p className="text-sm text-gray-500">Recalculate the unique identifier for all receipts to ensure data integrity.</p>
            </div>
            {isBackfilling ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
            )}
          </button>
        </div>

        {/* Logout Action */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={onLogout}
            className="w-full text-left flex justify-between items-center p-4 rounded-lg text-red-600 hover:bg-red-50"
          >
            <div>
              <p className="font-semibold">Logout</p>
              <p className="text-sm text-red-500">Sign out of your SpendWiseAI account.</p>
            </div>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
