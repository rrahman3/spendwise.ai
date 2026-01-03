
import React from 'react';

interface LandingPageProps {
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                 <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                 </svg>
               </div>
               <h1 className="text-xl font-black tracking-tight text-gray-900">SpendWise<span className="text-blue-600">AI</span></h1>
            </div>
            <button
              onClick={onLogin}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Login or Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900">
            Smart receipts scanning, <br />
            <span className="text-blue-600">effortless expense tracking.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-500">
            Stop manually entering receipts. With SpendWiseAI, you can track your spending, and gain insights into your finances with our AI-powered receipt scanner.
          </p>
          <div className="mt-8">
            <button
              onClick={onLogin}
              className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Get Started for Free
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Features</h2>
            <p className="mt-4 text-lg text-gray-500">Everything you need to manage your expenses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold">AI-Powered Scanning</h3>
              <p className="mt-2 text-gray-500">Our OCR technology accurately extracts data from your receipts.</p>
            </div>
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold">Smart Categorization</h3>
              <p className="mt-2 text-gray-500">Automatically categorize your expenses for better insights.</p>
            </div>
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold">Insightful Dashboards</h3>
              <p className="mt-2 text-gray-500">Visualize your spending habits with our interactive charts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
            <p>&copy; 2024 SpendWiseAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
