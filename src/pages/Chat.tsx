import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, Loader2, StopCircle, ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';

const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const genId = () => crypto.randomUUID();
const stripThink = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

const SUGGESTIONS = [
  'Viết component React',
  'Giải thích TypeScript',
  'Fix bug Tailwind',
  'Tạo API Express',
];

export default function Chat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-history');
      if (saved) {
        const restored = JSON.parse(saved).map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(restored);
      }
    } catch {}
  }, []);

  // Save limited history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages.slice(-50)));
    } else {
      localStorage.removeItem('ai-chat-history');
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  // Handle pending prompt from home page
  useEffect(() => {
    const pending = localStorage.getItem('pending-prompt');
    if (pending) {
      localStorage.removeItem('pending-prompt');
      handleSend(pending);
    }
  }, []);

  const startNewChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    setIsStreaming(false);
    localStorage.removeItem('ai-chat-history');
  };

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: new Date() };
    const assistantId = genId();

    // Gộp cả user và placeholder assistant vào một lần setMessages
    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    // Fix stale history: dùng messages + userMsg mới nhất
    const history = [...messages, userMsg]
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    try {
      const res = await fetch(SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt: text, history }),
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
            try {
              full += JSON.parse(line.slice(6)).delta ?? '';
            } catch (e) {
              console.error('Parse SSE error:', e);
            }
          }
        }
        if (!pending) { pending = true; requestAnimationFrame(flush); }
      }

      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: stripThink(full) } : m));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ Lỗi: ${err.message}` } : m));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [isLoading, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0F] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-72 border-r border-gray-800 bg-[#0F0F18]/80 backdrop-blur-sm p-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Quay lại</span>
        </button>
        <button onClick={startNewChat} className="w-full flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 text-white font-medium mb-6 hover:from-indigo-600 hover:to-violet-700 transition-all">
          <Plus className="h-4 w-4" />
          <span>Chat mới</span>
        </button>
        <div className="flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <span className="text-sm text-white truncate">Cuộc trò chuyện hiện tại</span>
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-gray-800 flex items-center gap-3">
          <Bot className="h-5 w-5 text-indigo-400" />
          <span className="text-sm text-gray-400">AI Assistant</span>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#0F0F18]/80 backdrop-blur-sm">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </button>
          <Bot className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold">AI Assistant</span>
          <div className="ml-auto">
            <button onClick={startNewChat} className="p-2 text-gray-400 hover:text-white">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-6">Hỏi tôi bất cứ điều gì</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-left px-4 py-3 bg-[#1A1A24] border border-gray-700/50 rounded-xl text-gray-300 hover:border-indigo-500/40 hover:-translate-y-0.5 hover:text-white transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isStreaming={isStreaming}
                isLast={idx === messages.length - 1}
              />
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
                <div className="flex items-center gap-2 bg-[#1A1A24] border border-gray-700/50 rounded-2xl px-4 py-3">
                  <span className="text-sm text-gray-400">Đang trả lời...</span>
                  <button onClick={() => abortRef.current?.abort()} className="p-1 hover:text-red-400 transition-colors">
                    <StopCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 bg-[#0F0F18]/80 backdrop-blur-sm px-4 py-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
              rows={1}
              className="flex-1 bg-[#1A1A24] border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-indigo-500/60 transition-all resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 p-3 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-0.5"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
