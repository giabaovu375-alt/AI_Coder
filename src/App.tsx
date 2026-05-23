import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare } from 'lucide-react';

const HF_SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-coder-sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restored = parsed.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setSessions(restored);
        if (restored.length > 0) {
          setCurrentSessionId(restored[0].id);
        }
      } catch (e) {
        console.error('Failed to load sessions:', e);
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('ai-coder-sessions', JSON.stringify(sessions));
    } else {
      localStorage.removeItem('ai-coder-sessions');
    }
  }, [sessions]);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'Cuộc trò chuyện mới',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setInput('');
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let sessionId = currentSessionId;
    let existingMessages: Message[] = [];

    if (!sessionId) {
      const newSession: ChatSession = {
        id: generateId(),
        title: input.trim().substring(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
      };
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
    } else {
      existingMessages = sessions.find(s => s.id === sessionId)?.messages || [];
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          title: s.messages.length === 0
            ? input.trim().substring(0, 30) + (input.length > 30 ? '...' : '')
            : s.title,
        };
      }
      return s;
    }));

    setInput('');
    setIsLoading(true);

    try {
      // Build history từ messages hiện có (không gồm message vừa gửi)
      const history = existingMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(HF_SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          history,
          system_prompt: 'You are a helpful coding assistant. Answer clearly and provide code examples when needed.',
        }),
      });

      let data: { response?: string; error?: string };
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { error: 'HF Space trả về response không hợp lệ, thử lại sau.' };
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response || `Lỗi: ${data.error || 'Không thể kết nối đến AI'}`,
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, assistantMessage] };
        }
        return s;
      }));
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Lỗi kết nối: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-slate-900">
      {/* Sidebar */}
      <div className="w-72 bg-slate-950 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Đoạn chat mới</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">Chưa có đoạn chat nào</p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                  currentSessionId === session.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-slate-500">{session.messages.length} tin nhắn</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">AI Assistant</p>
              <p className="text-slate-500 text-xs">Powered by Qwen 2.5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Assistant</h1>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Đang hoạt động
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {!currentSession || currentSession.messages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Xin chào! Tôi là AI Assistant</h2>
                <p className="text-slate-400 text-lg mb-8">Tôi có thể giúp gì cho bạn hôm nay?</p>
                <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
                  {['Giải thích code JavaScript', 'Viết code Python', 'Tối ưu thuật toán', 'Debug lỗi lập trình'].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 text-left hover:bg-slate-700 hover:border-emerald-500/50 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentSession.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-emerald-200' : 'text-slate-500'}`}>
                      {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <span className="text-slate-400">AI đang suy nghĩ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn của bạn..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-5 py-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
}

export default App;
