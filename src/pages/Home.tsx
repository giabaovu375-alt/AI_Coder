import { useState, useRef } from 'react';
import { Send, Bot, Menu, MessageSquare, Plus, X, ArrowUpRight } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const PRODUCTS = [
  { id: 'codenova', title: 'CodeNova', desc: 'Nền tảng học lập trình với AI', image: '/images/codenova.jpg', link: '#' },
  { id: 'chess', title: 'Game Review', desc: 'Phân tích ván cờ miễn phí', image: '/images/chess.jpg', link: '#' },
  { id: 'ai-coder', title: 'AI Coder', desc: 'Trợ lý lập trình AI', image: '/images/ai-coder.jpg', link: '#' },
  { id: 'tools', title: 'Công cụ', desc: 'Các tiện ích lập trình', image: '/images/tools.jpg', link: '#' },
];

interface Props {
  sessions: Session[];
  onCreateSession: (firstMessage: string) => string;
  onNavigateChat: (sessionId: string) => void;
}

export default function Home({ sessions, onCreateSession, onNavigateChat }: Props) {
  const [prompt, setPrompt] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const sessionId = onCreateSession(prompt.trim());
    setPrompt('');
    onNavigateChat(sessionId);
  };

  const featured = PRODUCTS[0];
  const rest = PRODUCTS.slice(1);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      {/* Menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-xl bg-[#1A1A24] border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar lịch sử (drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-[#0F0F18] border-r border-gray-800 p-4 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Lịch sử chat</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Chưa có cuộc trò chuyện nào</p>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSidebarOpen(false);
                      onNavigateChat(s.id);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 text-left transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-xs text-gray-500">{s.messages.length} tin nhắn</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pt-16 pb-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">
              AI Assistant
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Trợ lý AI thông minh, sẵn sàng trả lời mọi câu hỏi của bạn
          </p>
        </div>

        {/* Thanh chat */}
        <form onSubmit={handleSend} className="w-full max-w-2xl mb-8">
          <div className="relative flex items-center bg-[#1A1A24] border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/30 backdrop-blur-sm transition-all focus-within:border-indigo-500/60">
            <input
              ref={inputRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Nhập câu hỏi hoặc yêu cầu..."
              className="flex-1 bg-transparent px-6 py-5 text-white placeholder-gray-500 outline-none text-lg"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="mr-3 flex-shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 p-3 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>

        {/* Sản phẩm - Đẩy xuống dưới */}
        <div className="w-full max-w-5xl mt-8">
          <h2 className="text-xl font-semibold text-gray-300 mb-6">Sản phẩm của tôi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card lớn */}
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="lg:col-span-2 lg:row-span-2 group relative overflow-hidden rounded-2xl bg-[#1A1A24] border border-gray-700/50 p-6 hover:border-indigo-500/40 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="h-40 bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-xl mb-5 flex items-center justify-center">
                <span className="text-5xl opacity-40">{featured.title.charAt(0)}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{featured.title}</h3>
              <p className="text-gray-400 text-base">{featured.desc}</p>
            </a>

            {/* 3 card nhỏ */}
            {rest.map(item => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl bg-[#1A1A24] border border-gray-700/50 p-5 hover:border-indigo-500/40 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-4 w-4 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
