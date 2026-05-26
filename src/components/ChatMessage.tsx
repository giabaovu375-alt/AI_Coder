import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

interface Props {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
}

function ChatMessageComponent({ msg, isStreaming, isLast }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUser = msg.role === 'user';

  const handleCopy = useCallback(async () => {
    if (!msg.text || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [msg.text]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showCursor = !isUser && isStreaming && isLast;

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shrink-0 mt-1">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3
        ${isUser ? 'bg-blue-600 text-white' : 'bg-[#2f2f2f] text-white/90'}`}
      >
        {!isUser && msg.text && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
                       p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-white/70" />
            )}
          </button>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {msg.text}

          {/* cursor cực nhẹ, không layout shift */}
          {showCursor && (
            <span className="ml-1 inline-block w-[2px] h-[1em] bg-blue-400 animate-pulse align-middle" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-1">
          <span className="text-sm font-bold text-blue-400">B</span>
        </div>
      )}
    </div>
  );
}

export default memo(ChatMessageComponent, (prev, next) => {
  return (
    prev.msg.text === next.msg.text &&
    prev.msg.role === next.msg.role &&
    prev.isStreaming === next.isStreaming &&
    prev.isLast === next.isLast
  );
});
