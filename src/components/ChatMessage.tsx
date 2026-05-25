import { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

  // Streaming cursor: chỉ hiển thị ở tin nhắn cuối cùng khi đang streaming và có nội dung
  const showCursor = isStreaming && isLast && msg.content !== '';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      {/* Avatar cho assistant */}
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Bong bóng tin nhắn */}
      <div
        className={`relative group max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 ${
          isUser
            ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white'
            : 'bg-[#1A1A24] border border-gray-700/50 text-gray-100'
        }`}
      >
        {/* Nút copy (chỉ cho assistant) */}
        {!isUser && msg.content && (
          <button
            onClick={() => handleCopy(msg.content)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Nội dung tin nhắn */}
        <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed prose-p:my-2 prose-pre:my-3 prose-code:before:hidden prose-code:after:hidden">
          {!isUser ? (
            msg.content === '' ? (
              // Đang chờ stream
              isStreaming && (
                <span className="inline-block w-2 h-5 bg-indigo-400 animate-pulse rounded-sm align-middle" />
              )
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    return match ? (
                      <div className="relative my-3 rounded-xl overflow-hidden border border-gray-700/50">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80">
                          <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
                          <button
                            onClick={() => handleCopy(codeString)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.875rem' }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-gray-800 text-indigo-300 text-[13px] font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
        </div>

        {/* Streaming cursor */}
        {showCursor && (
          <span className="inline-block w-2 h-5 bg-indigo-400 animate-pulse rounded-sm align-middle ml-0.5" />
        )}
      </div>

      {/* Avatar cho user */}
      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-sm font-bold text-indigo-400">B</span>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
