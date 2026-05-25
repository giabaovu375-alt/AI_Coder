import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, StopCircle, Copy, Check, ArrowLeft } from 'lucide-react';

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

const CodeBlock = ({ code, lang }: { code: string; lang: string }) => {
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
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
};

const renderContent = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] ?? '';
      const code = match?.[2] ?? part.replace(/```/g, '');
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
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

const ChatBubble = ({ msg }: { msg: Message }) => {
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
};

interface Props {
  onBack: () => void;
}

export default function Chat({ onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lấy pending prompt từ localStorage và gửi ngay
  useEffect(() => {
    const pending = localStorage.getItem('pending-prompt');
    if (pending) {
      localStorage.removeItem('pending-prompt');
      setInput(pending);
      // Tự động gửi sau khi input đã được set
      setTimeout(() => {
        const event = new Event('submit') as any;
        handleSubmit(event as React.FormEvent);
      }, 100);
    }
  }, []);

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

  const stopGeneration = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40 bg-slate-900/80 backdrop-blur">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white">AI Assistant</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-violet-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Bắt đầu cuộc trò chuyện</h2>
            <p className="text-slate-400 text-sm">Hỏi tôi bất cứ điều gì về lập trình, AI, hay kiến thức chung</p>
          </div>
        ) : (
          messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)
        )}

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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/40 px-4 py-3 bg-slate-900/80">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-slate-800/80 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 backdrop-blur focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-white shadow-lg shadow-violet-500/20 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
