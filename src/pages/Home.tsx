import { useState, useEffect } from 'react';
import { ArrowRight, Menu, X, Sparkles, Send, Bot, Image, Code2, Globe } from 'lucide-react';
import { BIG_PRODUCT, SMALL_PRODUCTS, type Product } from '../data/products';

const iconMap: Record<string, React.ComponentType<any>> = {
  Bot, Image, Code2, Globe, Sparkles, Send, ArrowRight, Menu, X,
};

interface Props {
  onStartChat: (msg: string) => void;
}

export default function Home({ onStartChat }: Props) {
  const [input, setInput] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function send() {
    const text = input.trim();
    if (!text) return;
    onStartChat(text);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const renderProductCard = (product: Product, isBig: boolean) => {
    const IconComponent = iconMap[product.icon] || Sparkles;
    return (
      <div
        key={product.id}
        className={`rounded-2xl p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer group ${isBig ? 'lg:col-span-1' : ''}`}
      >
        {product.image && (
          <div className="w-full h-48 mb-4 rounded-xl overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-4 shadow-lg`}>
          <IconComponent size={22} className="text-white" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{product.name}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{product.description}</p>
        <button className="mt-4 text-blue-400 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
          Khám phá <ArrowRight size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">Nova AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Tính năng', 'Sản phẩm', 'Giá cả'].map(item => (
              <a key={item} href="#" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{item}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 transition-colors">Đăng nhập</button>
            <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">Đăng ký</button>
          </div>

          <button className="md:hidden text-slate-300" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {navOpen && (
          <div className="md:hidden bg-[#0f172a]/95 border-t border-white/10 px-4 pb-4 animate-fade-in-up">
            <div className="pt-3 space-y-1">
              {['Tính năng', 'Sản phẩm', 'Giá cả'].map(item => (
                <a key={item} href="#" className="block text-slate-300 py-2.5 px-3 rounded-lg hover:bg-white/8">{item}</a>
              ))}
              <div className="flex gap-2 pt-3 border-t border-white/10">
                <button className="flex-1 border border-white/15 text-slate-300 py-2 rounded-xl">Đăng nhập</button>
                <button className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Đăng ký</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            <span className="text-blue-300 text-sm">Phiên bản 2.0</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-5 leading-tight">
            <span className="text-white">Trợ lý AI thông minh</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">dành cho bạn</span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Nova AI giúp bạn hoàn thành công việc nhanh hơn với khả năng hiểu ngôn ngữ tự nhiên.
          </p>

          {/* Chat input on homepage */}
          <div className="w-full max-w-2xl mx-auto mb-8">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-blue-500/50 focus-within:bg-white/8 transition-all">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Hỏi Nova AI bất cứ điều gì..."
                className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2"
              >
                <span className="hidden sm:inline">Gửi</span>
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {['Viết email chuyên nghiệp', 'Tóm tắt tài liệu', 'Giải thích khái niệm'].map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="text-slate-400 hover:text-white hover:bg-white/8 border border-white/10 rounded-full px-4 py-1.5 text-sm transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">Sản phẩm</h2>
          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors">
            Xem tất cả <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Big card */}
          {renderProductCard(BIG_PRODUCT, true)}

          {/* Small cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SMALL_PRODUCTS.map(p => renderProductCard(p, false))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-4 py-8 text-center">
        <p className="text-slate-500 text-sm">Nova AI © 2026</p>
      </footer>
    </div>
  );
}
