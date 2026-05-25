import { Bot, Send } from 'lucide-react';
import { useState, useRef } from 'react';
import { MY_PRODUCTS } from '../data/products';

interface Props {
  onNavigateChat: () => void;
  onNavigateProduct: (id: string) => void;
}

export default function Home({ onNavigateChat, onNavigateProduct }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // Lưu tạm câu hỏi vào localStorage để trang Chat lấy ra
    localStorage.setItem('pending-prompt', input.trim());
    setInput('');
    onNavigateChat();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              AI Assistant
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Hỏi tôi bất cứ điều gì hoặc khám phá những sản phẩm tôi đã xây dựng
          </p>
        </div>

        {/* Ô chat nhỏ */}
        <div className="mb-12">
          <form onSubmit={handleSend} className="flex gap-3 max-w-2xl mx-auto">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Nhập câu hỏi để bắt đầu chat..."
              className="flex-1 bg-slate-800/80 border border-slate-700/40 rounded-xl px-5 py-3.5 text-[15px] text-white placeholder-slate-400 backdrop-blur transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3.5 text-white shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        {/* Danh sách sản phẩm – Card to hơn */}
        <h2 className="text-2xl font-bold text-white mb-6">Sản phẩm của tôi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MY_PRODUCTS.map(product => (
            <button
              key={product.id}
              onClick={() => onNavigateProduct(product.id)}
              className="group w-full text-left rounded-2xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-sm transition-all hover:border-violet-500/30 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-violet-500/10 active:scale-[0.98]"
            >
              <div className="flex items-start gap-5">
                {product.image && (
                  <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="h-full w-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-violet-400 transition-colors">
                    {product.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-3">{product.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
