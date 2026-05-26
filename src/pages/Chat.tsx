import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Sparkles, Send, Square, ChevronDown,
  Plus, Trash2, MessageSquare, Menu, X,
} from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import type { Message } from '../components/ChatMessage';

// ---------- Interfaces ----------
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

interface Props {
  onBack: () => void;
}

// ---------- Constants ----------
const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';
const SESSION_STORAGE_KEY = 'nova-ai-sessions';
const MAX_MESSAGES_PER_SESSION = 100;
const SCROLL_THRESHOLD = 120;
const FLUSH_INTERVAL_MS = 65;

const SUGGESTIONS = [
  'Giải thích khái niệm này cho tôi',
  'Viết code Python để...',
  'Tóm tắt văn bản sau',
  'So sánh hai phương pháp',
];

const genId = () => crypto.randomUUID();

// ---------- Helpers ----------
function stripThink(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function loadSessionsFromStorage(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return parsed.map(s => ({
      ...s,
      createdAt: s.createdAt || new Date().toISOString(),
      messages: (s.messages || []).slice(-MAX_MESSAGES_PER_SESSION),
    }));
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: ChatSession[]): void {
  try {
    const trimmed = sessions
      .filter(s => s.messages.length > 0)
      .map(s => ({ ...s, messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION) }));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* quota exceeded */ }
}

// ---------- Component ----------
export default function Chat({ onBack }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessionsFromStorage);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const stored = loadSessionsFromStorage();
    return stored[0]?.id ?? null;
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const sessionsRef = useRef(sessions);
  const rafRef = useRef<number>(0);
  const lastFlushRef = useRef<number>(0);

  // Keep sessionsRef in sync
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  // Debounced localStorage save (avoid writing on every stream chunk)
  useEffect(() => {
    const t = setTimeout(() => saveSessionsToStorage(sessions), 500);
    return () => clearTimeout(t);
  }, [sessions]);

  // Cleanup on unmount
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Auto-select first session
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  // Scroll-to-bottom button visibility
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Update the last assistant message in a session
  const updateLastMessage = useCallback((sessionId: string, assistantId: string, text: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const msgs = [...s.messages];
      const idx = msgs.findIndex(m => m.id === assistantId && m.role === 'ai');
      if (idx === -1) return s;
      msgs[idx] = { ...msgs[idx], text };
      return { ...s, messages: msgs };
    }));
  }, []);

  // Create a new session — stable ref via useCallback
  const createNewSession = useCallback((title?: string): string => {
    const newSession: ChatSession = {
      id: genId(),
      title: title || 'Cuộc trò chuyện mới',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, []);

  // Delete a session
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  }, [activeSessionId]);

  // Main send handler
  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Resolve or create session
    let sessionId = sessionsRef.current.find(s => s.id === activeSessionId)?.id;
    if (!sessionId) {
      sessionId = createNewSession(
        trimmed.slice(0, 30) + (trimmed.length > 30 ? '…' : '')
      );
    }

    const now = new Date().toISOString();
    const userMsg: Message = { id: genId(), role: 'user', text: trimmed, timestamp: now };
    const assistantId = genId();
    const assistantMsg: Message = { id: assistantId, role: 'ai', text: '', timestamp: now };

    // Build history from existing messages (exclude the new user message to avoid duplication)
    const existingMessages = sessionsRef.current.find(s => s.id === sessionId)?.messages ?? [];
    const history = existingMessages
      .slice(-9)
      .map(({ role, text: t }) => ({ role, content: t }));
    // Append current user turn
    history.push({ role: 'user', content: trimmed });

    // Add placeholder messages
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        title: s.messages.length === 0
          ? trimmed.slice(0, 30) + (trimmed.length > 30 ? '…' : '')
          : s.title,
        messages: [...s.messages, userMsg, assistantMsg].slice(-MAX_MESSAGES_PER_SESSION),
      };
    }));

    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setShowScrollBtn(false);
    scrollToBottom('smooth');

    try {
      const res = await fetch(SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt: trimmed, history }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No stream body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '', buffer = '', pending = false;

      const flush = () => {
        if (!mounted.current) return;
        pending = false;
        updateLastMessage(sessionId!, assistantId, stripThink(full));
        if (!showScrollBtn) scrollToBottom('smooth');
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              full += JSON.parse(line.slice(6)).delta ?? '';
            } catch { /* malformed chunk */ }
          }
        }

        if (!pending) {
          const now = performance.now();
          if (now - lastFlushRef.current > FLUSH_INTERVAL_MS) {
            lastFlushRef.current = now;
            pending = true;
            rafRef.current = requestAnimationFrame(() => {
              if (mounted.current) flush();
            });
          }
        }
      }

      // Final flush with complete text
      if (mounted.current) {
        updateLastMessage(sessionId!, assistantId, stripThink(full));
        scrollToBottom('smooth');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Remove empty assistant placeholder if user stopped before any text arrived
        setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            messages: s.messages.filter(m => !(m.id === assistantId && m.text === '')),
          };
        }));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Unknown error';
      updateLastMessage(sessionId!, assistantId, `⚠️ Lỗi kết nối: ${msg}`);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  }, [isLoading, activeSessionId, createNewSession, updateLastMessage, scrollToBottom, showScrollBtn]);

  const stopStream = useCallback(() => abortRef.current?.abort(), []);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend(input);
    }
  }, [handleSend, input]);

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#212121]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Quay lại"
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Mở lịch sử"
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-colors"
            >
              <Menu size={18} />
            </button>
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-semibold text-sm">Nova AI</span>
          </div>
          <button
            onClick={() => createNewSession()}
            aria-label="Cuộc trò chuyện mới"
            className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 bg-[#1a1a1a] border-r border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold">Lịch sử chat</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng sidebar"
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sessions.length === 0 && (
                <p className="text-xs text-white/30 text-center py-6">Chưa có cuộc trò chuyện</p>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    s.id === activeSessionId ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onClick={() => { setActiveSessionId(s.id); setSidebarOpen(false); }}
                  onKeyDown={e => e.key === 'Enter' && (setActiveSessionId(s.id), setSidebarOpen(false))}
                >
                  <MessageSquare size={14} className="text-white/40 shrink-0" />
                  <span className="text-xs truncate flex-1">{s.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                    aria-label="Xóa cuộc trò chuyện"
                    className="text-white/30 hover:text-red-400 p-0.5 rounded transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <main ref={mainRef} className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles size={32} className="text-blue-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-1">Bắt đầu trò chuyện</h2>
              <p className="text-sm text-white/40 mb-6">Nova AI sẵn sàng hỗ trợ bạn</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm text-white/60 hover:text-white px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isStreaming={isStreaming && i === messages.length - 1}
                  isLast={i === messages.length - 1}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom('smooth')}
            aria-label="Cuộn xuống"
            className="
              fixed bottom-24 right-6
              bg-[#2f2f2f] hover:bg-[#3a3a3a]
              border border-white/10
              text-white/70 hover:text-white
              p-2 rounded-full
              shadow-lg
              transition-all
              z-10
            "
          >
            <ChevronDown size={18} />
          </button>
        )}
      </main>

      {/* Input */}
      <div className="sticky bottom-0 bg-[#212121] border-t border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhắn tin..."
            rows={1}
            disabled={isLoading && !isStreaming}
            className="
              flex-1 bg-[#2f2f2f] rounded-xl px-4 py-2.5
              text-sm resize-none outline-none
              placeholder:text-white/30
              disabled:opacity-50
              transition-opacity
            "
          />
          {isStreaming ? (
            <button
              onClick={stopStream}
              aria-label="Dừng"
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={() => handleSend(input)}
              disabled={!canSend}
              aria-label="Gửi"
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
