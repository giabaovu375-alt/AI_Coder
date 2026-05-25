import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare, Menu, X } from 'lucide-react';

const HF_SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';
const MAX_MESSAGES = 50;

const cleanContent = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef(sessions);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages.length]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat-sessions');
      if (saved) {
        const restored = JSON.parse(saved).map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setSessions(restored);
        if (restored.length > 0) setCurrentSessionId(restored[0].id);
      }
    } catch { /* skip */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (sessions.length > 0) localStorage.setItem('chat-sessions', JSON.stringify(sessions));
      else localStorage.removeItem('chat-sessions');
    }, 500);
    return () => clearTimeout(t);
  }, [sessions]);

  const genId = () => crypto.randomUUID();

  const createNewSession = () => {
    const s: ChatSession = { id: genId(), title: 'Chat mới', messages: [], createdAt: new Date() };
    setSessions(prev => [s, ...prev]);
    setCurrentSessionId(s.id);
    setInput('');
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (currentSessionId === id) setCurrentSessionId(remaining[0]?.id ?? null);
      return remaining;
    });
  };

  const selectSession = (id: string) => {
    setCurrentSessionId(id);
    setSidebarOpen(false);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let sessionId = currentSessionId;
    const trimmed = input.trim();

    if (!sessionId) {
      const s: ChatSession = {
        id: genId(),
        title: trimmed.substring(0, 28) + (trimmed.length > 28 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
      };
      sessionsRef.current = [s, ...sessionsRef.current];
      setSessions(sessionsRef.current);
      sessionId = s.id;
      setCurrentSessionId(sessionId);
    }

    const existingMessages = sessionsRef.current.find(s => s.id === sessionId)?.messages ?? [];
    const userMsg: Message = { id: genId(), role: 'user', content: trimmed, timestamp: new Date() };

    setSessions(prev => prev.map(s => s.id === sessionId ? {
      ...s,
      messages: [...s.messages, userMsg].slice(-MAX_MESSAGES),
      title: s.messages.length === 0 ? trimmed.substring(0, 28) + (trimmed.length > 28 ? '...' : '') : s.title,
    } : s));

    setInput('');
    setIsLoading(true);

    const assistantId = genId();
    setSessions(prev => prev.map(s => s.id === sessionId ? {
      ...s,
      messages: [...s.messages, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }],
    } : s));

    try {
      const res = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          prompt: trimmed,
          history: existingMessages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';
      let frameQueued = false;

      const flush = () => {
        frameQueued = false;
        setSessions(prev => prev.map(s => s.id === sessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === assistantId ? { ...m, content: cleanContent(full) } : m),
        } : s));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try { full += JSON.parse(line.slice(6)).delta ?? ''; } catch { /* skip */ }
        }
        if (!frameQueued) { frameQueued = true; requestAnimationFrame(flush); }
      }

      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === assistantId ? { ...m, content: cleanContent(full) } : m).slice(-MAX_MESSAGES),
      } : s));

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === assistantId
          ? { ...m, content: `Lỗi: ${err instanceof Error ? err.message : 'Không xác định'}` } : m),
      } : s));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, currentSessionId]);

  return (
    <div className="h-screen flex bg-slate-900 overflow-hidden">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-slate-950 border-r border-slate-700 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-3 border-b border-slate-700 flex items-center gap-2">
          <button onClick={createNewSession}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Chat mới
          </button>
          <button onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-500 text-xs">Chưa có chat nào</p>
            </div>
          ) : sessions.map(s => (
            <div key={s.id} onClick={() => selectSession(s.id)}
              className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                currentSessionId === s.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60'
              }`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{s.title}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700 rounded transition-all">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-700 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <p className="text-white text-sm font-medium">AI Assistant</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="border-b border-slate-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">AI Assistant</h1>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Đang hoạt động
            </p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
            {!currentSession || currentSession.messages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-600 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Xin chào!</h2>
                <p className="text-slate-400 text-sm mb-5">Tôi có thể giúp gì cho bạn?</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                  {['Giải thích khái niệm', 'Viết code Python', 'Tư vấn lập trình', 'Hỏi đáp chung'].map((s, i) => (
                    <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs text-left hover:bg-slate-700 hover:border-emerald-500/50 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : currentSession.messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.content}
                    {msg.role === 'assistant' && msg.content === '' && (
                      <span className="inline-block w-1.5 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />
                    )}
                  </p>
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="text-slate-400 text-sm">Đang trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <footer className="border-t border-slate-700 px-3 py-3 flex-shrink-0">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }}}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default App;
