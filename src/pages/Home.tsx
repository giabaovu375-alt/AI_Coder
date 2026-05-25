import { useState, useRef } from 'react';
import { Send, Bot, ArrowUpRight } from 'lucide-react';

const products = [
  { id: 'codenova', title: 'CodeNova', desc: 'Nền tảng học lập trình với AI', image: '/images/codenova.jpg', link: '#' },
  { id: 'chess', title: 'Game Review', desc: 'Phân tích ván cờ miễn phí', image: '/images/chess.jpg', link: '#' },
  { id: 'ai-coder', title: 'AI Coder', desc: 'Trợ lý lập trình AI', image: '/images/ai-coder.jpg', link: '#' },
  { id: 'tools', title: 'Công cụ', desc: 'Các tiện ích lập trình', image: '/images/tools.jpg', link: '#' },
];

export default function Home({ onNavigateChat }: { onNavigateChat: () => void }) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    localStorage.setItem('pending-prompt', prompt.trim());
    setPrompt('');
    onNavigateChat();
  };

  const featured = products[0];
  const rest = products.slice(1);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
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

      {/* Thanh chat chính giữa */}
      <form onSubmit={handleSend} className="w-full max-w-2xl mb-14">
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

      {/* Sản phẩm */}
      <div className="w-full max-w-5xl">
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
  );
}
