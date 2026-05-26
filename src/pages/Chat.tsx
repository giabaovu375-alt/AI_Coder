import { useState, useEffect, useRef, startTransition, useCallback } from 'react';
import {
  ArrowLeft, Sparkles, Send, Square, ChevronDown,
  Paperclip, Mic, MoreHorizontal
} from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import type { Message } from '../components/ChatMessage';

interface Props {
  onBack: () => void;
  initialMessage: string;
}

const SPACE_URL = 'https://toilatop1sever-ai-coder.hf.space/chat';

const SUGGESTIONS = [
  'Giải thích khái niệm này cho tôi',
  'Viết code Python để...',
  'Tóm tắt văn bản sau',
  'So sánh hai phương pháp',
];

const stripThink = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

export default function Chat({ onBack, initialMessage }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const initialSent = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const rafRef = useRef<number>(0);
  const lastFlushRef = useRef<number>(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initialMessage) return;
    if (initialSent.current === initialMessage) return;
    initialSent.current = initialMessage;
    handleSend(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  // Scroll tối ưu: chỉ chạy khi số lượng message thay đổi
  useEffect(() => {
    if (showScrollBtn) return;
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages.length, showScrollBtn]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [input]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Hàm helper cập nhật tin nhắn cuối cùng (chỉ sửa phần tử cuối, không map toàn bộ)
  const updateLastMessage = (assistantId: string, text: string) => {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.id === assistantId) {
        next[next.length - 1] = { ...last, text };
      }
      return next;
    });
  };

  async function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'ai',
      text: '',
      timestamp: new Date().toISOString(),
    };

    const latestMessages = messagesRef.current;
    const history = [...latestMessages, userMsg]
      .slice(-10)
      .map(({ role, text: msgText }) => ({ role, content: msgText }));

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setShowScrollBtn(false);

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
        if (!mounted.current) return;
        pending = false;
        startTransition(() => {
          updateLastMessage(assistantId, full);
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { full += JSON.parse(line.slice(6)).delta ?? ''; } catch { /* ignore */ }
          }
        }
        if (!pending) {
          // Throttle: giới hạn khoảng 25fps
          const now = performance.now();
          if (now - lastFlushRef.current > 40) {
            lastFlushRef.current = now;
            pending = true;
            rafRef.current = requestAnimationFrame(() => {
              if (mounted.current) flush();
            });
          }
        }
      }
      if (mounted.current) {
        const finalText = stripThink(full);
        startTransition(() => {
          updateLastMessage(assistantId, finalText);
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => prev.filter(m => !(m.id === assistantId && m.role === 'ai' && !m.text)));
        return;
      }
      const msg = err instanceof Error ? err.message : 'Unknown error';
      startTransition(() => {
        updateLastMessage(assistantId, `Lỗi kết nối: ${msg}`);
      });
    } finally {
      if (mounted.current) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  }

  function stopStream() {
    abortRef.current?.abort();
    // finally sẽ tự reset isLoading và isStreaming
  }

  function send() { handleSend(input); }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="min-h-screen bg-[#212121] flex flex-col text-white">
      <header className="sticky top-0 z-10 bg-[#212121]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/50 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/8 -ml-1.5"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Nova AI</p>
                <p className="text-[10px] text-green-400 leading-tight flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  Đang hoạt động
                </p>
              </div>
            </div>
          </div>
          <button className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/8">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
                  <Sparkles size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Xin chào!</h1>
                  <p className="text-white/40 mt-1 text-sm">Tôi có thể giúp gì cho bạn hôm nay?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left text-sm text-white/60 hover:text-white px-4 py-3 rounded-xl border border-white/8 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
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
      </main>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 text-xs text-white/70 bg-[#2f2f2f] border border-white/10 rounded-full px-4 py-2 shadow-xl hover:bg-[#3a3a3a] transition-all duration-200 animate-fade-in"
        >
          <ChevronDown size={14} />
          Cuộn xuống
        </button>
      )}

      <div className="sticky bottom-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-4 pb-5 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-[#2f2f2f] border border-white/[0.08] rounded-2xl shadow-2xl focus-within:border-white/20 transition-colors duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Nhắn tin với Nova AI..."
              rows={1}
              className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm text-white placeholder-white/30 focus:outline-none resize-none leading-relaxed"
            />

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button className="text-white/30 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/8">
                  <Paperclip size={16} />
                </button>
                <button className="text-white/30 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/8">
                  <Mic size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isLoading && (
                  <button
                    onClick={stopStream}
                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-150"
                  >
                    <Square size={12} className="fill-current" />
                    Dừng
                  </button>
                )}
                <button
                  onClick={send}
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/20 text-white transition-all duration-150 hover:shadow-lg hover:shadow-blue-500/30 disabled:cursor-not-allowed"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-2">
            Nova AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </p>
        </div>
      </div>
    </div>
  );
}
