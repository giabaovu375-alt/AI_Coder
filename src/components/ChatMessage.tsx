import { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  timestamp?: Date;
}

interface Props {
  msg: Message;
  isStreaming: boolean;
  isLast: boolean;
}

const ChatMessage = ({ msg, isStreaming, isLast }: Props) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const showCursor = isStreaming && isLast && msg.text !== '';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div
        className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-[#2f2f2f] text-white/90'
        }`}
      >
        {!isUser && msg.text && (
          <button
            onClick={() => handleCopy(msg.text)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {!isUser && msg.text === '' && isStreaming ? (
            <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse rounded-sm align-middle" />
          ) : (
            msg.text
          )}
        </div>

        {showCursor && (
          <span className="inline-block w-2 h-5 bg-blue-400 animate-pulse rounded-sm align-middle ml-0.5" />
        )}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-sm font-bold text-blue-400">B</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
