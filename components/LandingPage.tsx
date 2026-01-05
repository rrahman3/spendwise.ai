
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
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm">
            Financial clarity powered by AI
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tighter text-gray-900 leading-tight">
            Smart receipt scanning, <br />
            <span className="text-blue-600">effortless expense control.</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-500">
            SpendWiseAI turns every receipt into structured, categorized data. Automate your tracking, spot duplicates, and get real-time insights before the month ends.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Get Started for Free
            </button>
            <div className="text-sm text-gray-500">No credit card required · Secure by Firebase</div>
          </div>
        </div>
      </main>

      {/* About Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-blue-600 font-semibold">Why SpendWiseAI</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900 leading-tight">Built for busy teams and solo founders</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Snap a picture or upload a CSV—our AI extracts every line item, detects duplicates, and keeps your ledger clean.
              Spend less time wrangling receipts and more time shipping product, advising clients, or growing your business.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-3xl font-black text-blue-600">99%</p>
                <p className="text-sm text-gray-500">field extraction accuracy on clear receipts</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-3xl font-black text-blue-600">2x</p>
                <p className="text-sm text-gray-500">faster close when duplicates are auto-flagged</p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold">1</div>
              <div>
                <h4 className="font-semibold text-gray-900">Capture</h4>
                <p className="text-gray-500 text-sm">Upload images or CSVs; we parse store, date, totals, and line items.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold">2</div>
              <div>
                <h4 className="font-semibold text-gray-900">Clean</h4>
                <p className="text-gray-500 text-sm">Auto-categorization plus duplicate detection keeps your books tidy.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold">3</div>
              <div>
                <h4 className="font-semibold text-gray-900">Control</h4>
                <p className="text-gray-500 text-sm">Dashboards, exports, and AI chat help you answer spend questions instantly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
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

      {/* Pricing Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-blue-600 font-semibold">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Start free, scale as you grow</h2>
            <p className="mt-4 text-lg text-gray-500">Simple plans with unlimited scans on paid tiers.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$0",
                note: "per month",
                features: ["50 scans/month", "Basic categorization", "Email support"]
              },
              {
                name: "Pro",
                price: "$19",
                note: "per month",
                features: ["Unlimited scans", "Duplicate detection", "AI chat & exports", "Priority support"],
                highlighted: true
              },
              {
                name: "Team",
                price: "$49",
                note: "per month",
                features: ["Unlimited scans", "Team workspaces", "Role-based access", "Slack alerts"]
              }
            ].map((tier) => (
              <div
                key={tier.name}
                className={`p-8 rounded-3xl border shadow-sm bg-white ${tier.highlighted ? "border-blue-200 shadow-lg shadow-blue-100" : "border-gray-100"}`}
              >
                <p className="text-sm font-semibold text-blue-600">{tier.name}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="text-4xl font-black text-gray-900">{tier.price}</p>
                  <p className="text-gray-500">{tier.note}</p>
                </div>
                <ul className="mt-6 space-y-2 text-gray-600">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onLogin}
                  className={`mt-8 w-full py-3 rounded-xl font-semibold transition-colors ${tier.highlighted ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
                >
                  {tier.highlighted ? "Start Pro Trial" : "Choose Plan"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-blue-600 font-semibold">Insights</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Fresh finance reads</h2>
            <p className="mt-4 text-lg text-gray-500">Short, actionable pieces to keep you ahead.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "The 20-Minute Monthly Close",
                excerpt: "A simple ritual to reconcile receipts, squash duplicates, and stay audit-ready.",
                tag: "Workflow"
              },
              {
                title: "How AI Cuts Expense Creep",
                excerpt: "Spotting patterns in small recurring charges before they snowball.",
                tag: "AI & Finance"
              },
              {
                title: "Receipts to Insights in 3 Steps",
                excerpt: "Capture, clean, and question your spend with an AI chat layer.",
                tag: "Playbook"
              }
            ].map((post) => (
              <article key={post.title} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">{post.tag}</span>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{post.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{post.excerpt}</p>
                <button className="mt-4 text-blue-600 font-semibold text-sm inline-flex items-center gap-1">
                  Read more
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black leading-tight">Ready to stop chasing receipts?</h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Join SpendWiseAI and get a cleaner ledger, faster closes, and instant spend answers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="bg-white text-blue-700 px-10 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Start for Free
            </button>
            <div className="text-sm text-blue-100">Works on web and mobile · Secure by design</div>
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
