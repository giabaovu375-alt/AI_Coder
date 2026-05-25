import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare, Menu, Sparkles, Activity, StopCircle } from 'lucide-react';

const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';
const MAX_MESSAGES = 50;
const STORAGE_KEY = 'chat-sessions-v2';

const stripThink = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
const genId = () => crypto.randomUUID();

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  title: string;
  messages: Msg[];
  createdAt: Date;
}

const SuggestionButton = memo(({ text, icon, onClick }: { text: string; icon: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-left text-sm text-slate-300 backdrop-blur transition-all hover:border-emerald-500/40 hover:bg-slate-800/80 active:scale-[0.98]"
  >
    <span className="text-xl">{icon}</span>
    <span className="font-medium">{text}</span>
  </button>
));

const ChatMessage = memo(({ msg }: { msg: Msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'rounded-br-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
            : 'rounded-bl-sm border border-slate-700/50 bg-slate-800/80 text-slate-100 backdrop-blur'
        }`}
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {msg.content}
          {!isUser && msg.content === '' && (
            <span className="inline-block h-5 w-2 animate-pulse rounded bg-emerald-400 align-middle" />
          )}
        </p>
        <p className={`mt-2 text-xs ${isUser ? 'text-emerald-100/80' : 'text-slate-500'}`}>
          {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-slate-700 flex items-center justify-center">
          <User className="h-4 w-4 text-slate-300" />
        </div>
      )}
    </div>
  );
});

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sessionsRef = useRef(sessions);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  const currentSession = useMemo(() => sessions.find(s => s.id === currentId), [sessions, currentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw).map((s: Session) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Msg) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setSessions(parsed);
        if (parsed.length) setCurrentId(parsed[0].id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      else localStorage.removeItem(STORAGE_KEY);
    }, 400);
    return () => clearTimeout(timer);
  }, [sessions]);

  const createSession = useCallback(() => {
    const s: Session = { id: genId(), title: 'Cuộc trò chuyện mới', messages: [], createdAt: new Date() };
    setSessions(prev => [s, ...prev]);
    setCurrentId(s.id);
    setInput('');
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (currentId === id) setCurrentId(remaining[0]?.id ?? null);
      return remaining;
    });
  }, [currentId]);

  const selectSession = useCallback((id: string) => {
    setCurrentId(id);
    setSidebarOpen(false);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let sid = currentId;
    if (!sid) {
      const s: Session = { id: genId(), title: text.slice(0, 28) + (text.length > 28 ? '...' : ''), messages: [], createdAt: new Date() };
      sessionsRef.current = [s, ...sessionsRef.current];
      setSessions(sessionsRef.current);
      sid = s.id;
      setCurrentId(sid);
    }

    const prevMsgs = sessionsRef.current.find(s => s.id === sid)?.messages ?? [];
    const userMsg: Msg = { id: genId(), role: 'user', content: text, timestamp: new Date() };

    setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, userMsg].slice(-MAX_MESSAGES), title: s.messages.length === 0 ? text.slice(0, 28) + (text.length > 28 ? '...' : '') : s.title } : s));
    setInput('');
    setIsLoading(true);

    const assistantId = genId();
    setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }] } : s));

    try {
      const res = await fetch(SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt: text, history: prevMsgs.slice(-10).map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('Stream not available');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '', buffer = '', pending = false;

      const flush = () => {
        pending = false;
        const cleaned = stripThink(full);
        setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === assistantId ? { ...m, content: cleaned } : m) } : s));
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

      const finalContent = stripThink(full);
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === assistantId ? { ...m, content: finalContent } : m).slice(-MAX_MESSAGES) } : s));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === assistantId ? { ...m, content: `⚠️ Lỗi: ${msg}` } : m) } : s));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, currentId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }
  }, [handleSubmit]);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-700/50 bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="border-b border-slate-700/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Chat</h2>
              <p className="text-xs text-slate-400">Online · ready</p>
            </div>
          </div>
          <button onClick={createSession} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Cuộc trò chuyện mới
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {sessions.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80">
                <MessageSquare className="h-7 w-7 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Chưa có cuộc trò chuyện</p>
              <p className="mt-1 text-xs text-slate-600">Tạo cuộc trò chuyện đầu tiên</p>
            </div>
          ) : (
            sessions.map(s => (
              <button key={s.id} onClick={() => selectSession(s.id)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${currentId === s.id ? 'border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
                <MessageSquare className={`h-4 w-4 flex-shrink-0 ${currentId === s.id ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.messages.length} tin nhắn</p>
                </div>
                <div onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">AI Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Activity className="h-3 w-3" /> Đang hoạt động
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-shrink-0 items-center gap-4 border-b border-slate-700/50 bg-slate-900/50 px-4 py-4 backdrop-blur-sm lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" /> Sẵn sàng hỗ trợ bạn
            </p>
          </div>
          {currentSession && (
            <div className="hidden text-right sm:block">
              <p className="text-xs text-slate-400">Cuộc trò chuyện</p>
              <p className="text-sm font-medium text-white">{currentSession.messages.length} tin nhắn</p>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 lg:px-6">
            {!currentSession || currentSession.messages.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">Xin chào!</h2>
                <p className="mx-auto mb-8 max-w-md text-base text-slate-400">Tôi là trợ lý AI thông minh, sẵn sàng hỗ trợ bạn với mọi câu hỏi.</p>
                <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { text: 'Giải thích khái niệm', icon: '💡' },
                    { text: 'Viết code Python', icon: '🐍' },
                    { text: 'Tư vấn lập trình', icon: '👨‍💻' },
                    { text: 'Hỏi đáp chung', icon: '❓' },
                  ].map((s, i) => (
                    <SuggestionButton key={i} {...s} onClick={() => { setInput(s.text); inputRef.current?.focus(); }} />
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="mt-1 h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-700/50 bg-slate-800/80 px-4 py-3 backdrop-blur">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span className="text-sm text-slate-400">Đang trả lời...</span>
                  <button onClick={stopGeneration} className="ml-2 rounded-lg p-1 text-slate-500 transition-colors hover:text-red-400">
                    <StopCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <footer className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/50 px-4 py-4 backdrop-blur-sm lg:px-6">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tin nhắn..."
                className="w-full rounded-xl border border-slate-700/50 bg-slate-800/80 px-5 py-3.5 text-[15px] text-white placeholder-slate-400 backdrop-blur transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                disabled={isLoading}
              />
            </div>
            <button type="submit" disabled={isLoading || !input.trim()} className="flex-shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-3 text-center text-xs text-slate-600">AI Assistant có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</p>
        </footer>
      </div>
    </div>
  );
}
