import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useStore } from './store/useStore';
import { Send, BarChart2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function App() {
  const { messages, stats, addMessage, setStats } = useStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/data`);
        setStats(res.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    
    fetchStats();
    // Auto-refresh the dashboard data every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [setStats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    addMessage({ role: 'user', content: userMsg });
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chat`, { query: userMsg });
      addMessage({ role: 'assistant', content: res.data.response });
    } catch (error) {
      addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-slate-800">
      {/* Sidebar / Stats Panel */}
      <div className="w-1/3 max-w-sm bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-8 border-b border-slate-100 flex items-center gap-4">
          <div className="h-14 flex items-center justify-center">
            <img src="/logo.png" alt="INGRES Logo" className="h-full object-contain drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-950">INGRES Chatbot</h1>
            <p className="text-xs text-cyan-700/80 font-bold uppercase tracking-widest mt-1">Ground Water Estimation</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-3xl p-6 border border-cyan-100/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-cyan-600 opacity-5">
               <BarChart2 size={64} />
            </div>
            <h2 className="text-sm font-bold text-cyan-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <BarChart2 size={16} /> Data Ingested
            </h2>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-4xl font-black text-cyan-600 tracking-tighter">{stats?.total_rows || 0}</p>
                <p className="text-xs text-cyan-600/80 font-bold uppercase tracking-widest mt-1">Total Rows</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-700">{stats?.files_processed || 0}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Files</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wide">File Statistics</h2>
            <div className="w-full">
              {Array.isArray(stats?.file_stats) && stats.file_stats.length > 0 ? (
                <div className="flex flex-col space-y-3">
                  {stats.file_stats.map((file, idx) => {
                    const maxRows = Math.max(...stats.file_stats.map(f => f.rows || 0), 1);
                    const pct = Math.round(((file.rows || 0) / maxRows) * 100);
                    return (
                      <div key={idx} className="flex items-center">
                        <div className="w-32 text-xs text-slate-500 truncate pr-2">{file.name}</div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-r-md overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-r-md" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="w-12 text-right text-xs text-slate-600 font-medium pl-2">{file.rows}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-20 w-full flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No data available
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mt-6">
            <h2 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wide">Top 10 Districts by Rainfall</h2>
            <div className="w-full">
              <div className="flex flex-col space-y-3">
                {[
                  { DISTRICT: "BALAGHAT", Total_Rainfall: 29432 },
                  { DISTRICT: "MANDLA", Total_Rainfall: 25855 },
                  { DISTRICT: "SAGAR", Total_Rainfall: 25811 },
                  { DISTRICT: "CHHINDWARA", Total_Rainfall: 23526 },
                  { DISTRICT: "DHAR", Total_Rainfall: 23459 },
                  { DISTRICT: "BETUL", Total_Rainfall: 21561 },
                  { DISTRICT: "SEONI", Total_Rainfall: 21177 },
                  { DISTRICT: "JABALPUR", Total_Rainfall: 20054 },
                  { DISTRICT: "HOSHANGABAD", Total_Rainfall: 19335 },
                  { DISTRICT: "DINDORI", Total_Rainfall: 19273 }
                ].map((item, idx) => {
                  const maxRain = 29432;
                  const pct = Math.round((item.Total_Rainfall / maxRain) * 100);
                  return (
                    <div key={idx} className="flex items-center hover:bg-slate-50 p-1 rounded-md transition-colors duration-150">
                      <div className="w-24 text-xs text-slate-500 truncate pr-2 font-medium" title={item.DISTRICT}>{item.DISTRICT}</div>
                      <div className="flex-1 h-5 bg-slate-100 rounded-r-md overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-r-md" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="w-16 text-right text-xs text-slate-600 font-bold pl-2">{Math.round(item.Total_Rainfall)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50 relative">
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-5 max-w-md mx-auto">
              <div className="w-24 h-24 bg-white border border-cyan-100 rounded-[2rem] flex items-center justify-center shadow-sm text-cyan-500 mb-2 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain opacity-80" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-800">Welcome to INGRES Chatbot</h3>
              <p className="text-slate-500 text-base leading-relaxed">Ask me anything about the Indian Ground Water Resource Estimation data. I can summarize, find specific records, or analyze trends from the ingested Excel files.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-3xl px-6 py-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-cyan-600 text-white rounded-br-md shadow-cyan-200' 
                    : 'bg-white border border-cyan-50 text-slate-700 rounded-bl-md shadow-sm shadow-cyan-900/5'
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-3xl rounded-bl-md px-6 py-4 shadow-sm flex items-center gap-3">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                </div>
                <span className="text-sm text-slate-500 font-semibold tracking-wide uppercase">Analyzing data</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your Excel data..."
              className="w-full pl-8 pr-16 py-5 bg-white border border-cyan-100 rounded-full focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-400 transition-all text-slate-800 shadow-sm font-medium text-[15px] placeholder:text-slate-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-3 w-12 h-12 flex items-center justify-center bg-cyan-600 text-white rounded-full hover:bg-cyan-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-200"
            >
              <Send size={20} className="ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
