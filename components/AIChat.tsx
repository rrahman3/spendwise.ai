
import React, { useState, useRef, useEffect } from 'react';
import { chatWithHistory } from '../services/geminiService';
import { Receipt, ChatMessage } from '../types';

interface AIChatProps {
  receipts: Receipt[];
}

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  // Simple parser for standard markdown features
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Handle Unordered Lists
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const text = line.trim().substring(2);
          return (
            <div key={i} className="flex items-start space-x-2 ml-2">
              <span className="text-blue-500 mt-1.5">•</span>
              <span className="flex-1">{parseInline(text)}</span>
            </div>
          );
        }
        // Handle Empty Lines
        if (line.trim() === '') return <div key={i} className="h-2" />;
        
        return <p key={i}>{parseInline(line)}</p>;
      })}
    </div>
  );
};

// Helper to handle bold and italic inline
function parseInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Changed text-white to text-blue-600 for readability on white background
      return <strong key={i} className="font-black text-blue-600">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-gray-700">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const AIChat: React.FC<AIChatProps> = ({ receipts }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hi! I'm your **SpendWise assistant**. I can help you analyze your spending history. Ask me things like:\n* What's the most expensive item I bought?\n* How much did I spend on **groceries** this week?\n* Summarize my spending at Walmart." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatWithHistory(receipts, userMessage);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I had trouble processing that. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[70vh]">
      <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-gray-900 tracking-tight">Intelligence Assistant</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Analyzing {receipts.length} Scanned Records
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 bg-[#fdfdfd]"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[75%] p-6 rounded-[2rem] shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-xl shadow-blue-100/50' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
            }`}>
              <div className="text-sm leading-relaxed font-medium">
                {msg.role === 'model' ? <MarkdownText content={msg.content} /> : <p className="text-white">{msg.content}</p>}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-6 rounded-[2rem] rounded-tl-none flex space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 bg-white border-t border-gray-100">
        <div className="flex w-full gap-3 items-stretch">
          <input
            type="text"
            placeholder="Ask about your purchase history..."
            className="flex-1 min-w-0 bg-gray-50 border-2 border-transparent rounded-2xl px-4 sm:px-6 py-3 sm:py-4 focus:ring-0 focus:border-blue-500 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl transition-all active:scale-95 shadow-xl shadow-blue-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
