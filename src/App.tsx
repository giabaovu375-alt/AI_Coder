import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, Bot, Loader2, StopCircle, Copy, Check } from 'lucide-react';
import { MY_PRODUCTS, type Product } from './data/products';
import ProductModal from './components/ProductModal';

const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';
const MAX_MESSAGES = 50;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const stripThink = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
const genId = () => crypto.randomUUID();

// Hàm escape HTML để phòng chống XSS khi render code
const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ── Code block với nút copy ────────────────────────────────────────
const CodeBlock = memo(({ code, lang }: { code: string; lang: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80">
        <span className="text-xs text-slate-400 font-mono">{lang || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Đã copy' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 bg-slate-900/90 overflow-x-auto text-sm text-emerald-300 font-mono leading-relaxed">
        <code>{escapeHtml(code.trim())}</code>
      </pre>
    </div>
  );
});

// ── Render markdown đơn giản ──────────────────────────────────────
const renderContent = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] ?? '';
      const code = match?.[2] ?? part.replace(/```/g, '');
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    // Inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((p, j) =>
          p.startsWith('`') && p.endsWith('`')
            ? <code key={j} className="px-1.5 py-0.5 rounded bg-slate-950/60 text-emerald-300 text-[13px] font-mono">{p.slice(1, -1)}</code>
            : <span key={j} className="whitespace-pre-wrap">{p}</span>
        )}
      </span>
    );
  });
};

// ── Chat bubble ───────────────────────────────────────────────────
const ChatBubble = memo(({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 ${
        isUser
          ? 'rounded-br-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
          : 'rounded-bl-sm border border-slate-700/40 bg-slate-800/70 text-slate-100 backdrop-blur-md'
      }`}>
        <div className="text-[15px] leading-relaxed">
          {msg.content === '' && !isUser
            ? <span className="inline-flex gap-1 items-center">
                <span className="h-5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                <span className="h-5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: '0.15s' }} />
                <span className="h-5 w-1.5 animate-pulse rounded-full bg-violet-400" style={{ animationDelay: '0.3s' }} />
              </span>
            : renderContent(msg.content)
          }
        </div>
        <p className={`mt-2 text-xs ${isUser ? 'text-violet-100/70' : 'text-slate-500'}`}>
          {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-slate-700 flex items-center justify-center">
          <span className="text-sm font-bold text-violet-400">B</span>
        </div>
      )}
    </div>
  );
});

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai-chat-history');
      if (raw) {
        const restored = JSON.parse(raw).map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(restored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (messages.length) localStorage.setItem('ai-chat-history', JSON.stringify(messages.slice(-MAX_MESSAGES)));
    }, 500);
    return () => clearTimeout(t);
  }, [messages]);

  const stopGeneration = () => { abortRef.current?.abort(); setIsLoading(false); };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg].slice(-MAX_MESSAGES));
    setInput('');
    setIsLoading(true);

    const assistantId = genId();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      const res = await fetch(SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: text,
          history: messages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '', buffer = '', pending = false;

      const flush = () => {
        pending = false;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stripThink(full) } : m));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { full += JSON.parse(line.slice(6)).delta ?? ''; } catch {}
          }
        }
        if (!pending) { pending = true; requestAnimationFrame(flush); }
      }

      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stripThink(full) } : m));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ Lỗi: ${msg}` } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0E14] via-[#111827] to-[#0B0E14] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <Bot className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
              AI Assistant
            </h1>
          </div>
          <p className="text-slate-400 text-base">Trợ lý AI thông minh, sẵn sàng trả lời mọi câu hỏi của bạn</p>
        </header>

        <div className="rounded-3xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden mb-10">
          <div className="h-[420px] lg:h-[520px] overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/20 mb-6">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Xin chào!</h2>
                <p className="text-slate-400 text-base max-w-md">Hãy đặt câu hỏi hoặc yêu cầu tôi viết code, giải thích thuật toán...</p>
              </div>
            ) : messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

            {isLoading && (
              <div className="flex gap-3">
                <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-700/40 bg-slate-800/70 px-4 py-3 backdrop-blur">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  <span className="text-sm text-slate-400">Đang trả lời...</span>
                  <button onClick={stopGeneration} className="ml-2 rounded-lg p-1 text-slate-500 hover:text-red-400 transition-colors">
                    <StopCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          <div className="border-t border-slate-700/40 px-6 py-4 bg-slate-900/40 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); } }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-slate-800/80 border border-slate-700/40 rounded-xl px-5 py-3.5 text-[15px] text-white placeholder-slate-400 backdrop-blur transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()}
                className="flex-shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3.5 text-white shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">Sản phẩm của tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MY_PRODUCTS.map(product => (
              <button key={product.id} onClick={() => setSelectedProduct(product)}
                className="group w-full text-left rounded-2xl border border-slate-700/40 bg-slate-900/60 p-5 backdrop-blur-sm transition-all hover:border-violet-500/30 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-violet-500/10 active:scale-[0.98]">
                <div className="flex items-start gap-4">
                  {product.image && (
                    <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">{product.title}</h3>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-2">{product.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
