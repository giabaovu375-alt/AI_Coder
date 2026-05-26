import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Sparkles, Send } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import type { Message as MessageType } from '../types';

interface Props {
  onBack: () => void;
  initialMessage: string;
}

const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';

export default function Chat({ onBack, initialMessage }: Props) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialMessage) {
      handleSend(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
  }, [input]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: MessageType = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    const assistantId = Date.now() + 1;
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'ai', text: '', timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const res = await fetch(SPACE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt: text, history: messages.slice(-10).map(({ role, text }) => ({ role, content: text })) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '', buffer = '', pending = false;

      const flush = () => {
        pending = false;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: full } : m));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { full += JSON.parse(line.slice(6)).delta ?? ''; } catch (e) { console.error(e); }
          }
        }
        if (!pending) { pending = true; requestAnimationFrame(flush); }
      }

      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: full } : m));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: `⚠️ Lỗi: ${err.message}` } : m));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  function send() {
    handleSend(input);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-white/70 hover:text-white transition-colors p-1">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-semibold">Nova AI</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-white/40 py-20">
              <p>Bắt đầu cuộc trò chuyện với Nova AI</p>
            </div>
          )}

          {messages.map(msg => (
            <ChatMessage key={msg.id} msg={msg} isStreaming={isStreaming} isLast={msg.id === messages[messages.length - 1]?.id} />
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'ai' && messages[messages.length - 1]?.text === '' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="text-white/50 px-4 py-3">Đang viết...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhắn tin..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/30 disabled:opacity-50 resize-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
