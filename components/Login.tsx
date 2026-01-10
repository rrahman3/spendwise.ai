
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => Promise<void> | void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await onLogin();
    } catch (error: any) {
      console.error("Login failed", error);
      setError(error.message || "An unknown error occurred");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9fafb] p-6">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200 mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            SpendWise<span className="text-blue-600">AI</span>
          </h1>
          <p className="mt-4 text-gray-500 font-medium">
            Master your finances with AI-powered receipt scanning and intelligent insights.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6 text-left sm:text-right">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-sm text-gray-400">Sign in to sync your receipts across devices</p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="w-full sm:w-auto flex items-center justify-center sm:justify-end space-x-3 py-4 px-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-70"
            >
              {isLoggingIn ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"
                    />
                    <path
                      fill="#34A853"
                      d="M16.04 18.013c-1.09.693-2.459 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.114C3.198 21.302 7.27 24 12 24c3.055 0 5.777-1.025 7.72-2.772l-3.68-3.215z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.275c0-.868-.077-1.705-.218-2.51H12v4.75h6.44c-.278 1.495-1.122 2.76-2.39 3.605l3.68 3.215C21.868 19.455 24 16.145 24 12.275"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.795.132-1.559.368-2.268L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.236 5.335l4.041-3.067z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative flex items-center py-2 w-full sm:w-auto sm:justify-end">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-400 font-semibold tracking-wide">or</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors w-full sm:w-auto">
              Continue as Guest
            </button>
          </div>
        </div>

        <div className="pt-12 grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900">1s</p>
            <p className="text-[10px] text-gray-400 font-bold">Scanning</p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900">100%</p>
            <p className="text-[10px] text-gray-400 font-bold">Accuracy</p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900">24/7</p>
            <p className="text-[10px] text-gray-400 font-bold">Assistant</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
