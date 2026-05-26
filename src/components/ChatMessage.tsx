import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Bot,
  Copy,
  Check,
} from 'lucide-react';

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

const Cursor = memo(function Cursor() {
  return (
    <span
      className="
        inline-block
        w-[2px]
        h-[1em]
        ml-1
        rounded-full
        bg-blue-400
        opacity-90
        align-middle
        animate-[blink_1s_steps(1)_infinite]
      "
    />
  );
});

function ChatMessageComponent({
  msg,
  isStreaming,
  isLast,
}: Props) {
  const [copied, setCopied] =
    useState(false);

  const timerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const isUser =
    msg.role === 'user';

  useEffect(() => {
    return () => {
      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  const handleCopy =
    useCallback(async () => {
      if (
        !navigator
          ?.clipboard ||
        !msg.text
      ) {
        return;
      }

      try {
        await navigator
          .clipboard
          .writeText(
            msg.text
          );

        setCopied(true);

        if (
          timerRef.current
        ) {
          clearTimeout(
            timerRef.current
          );
        }

        timerRef.current =
          setTimeout(
            () => {
              setCopied(
                false
              );
            },
            1200
          );
      } catch {}
    }, [msg.text]);

  const showCursor =
    !isUser &&
    isStreaming &&
    isLast &&
    msg.text.length >
      0;

  return (
    <div
      className={`
        flex
        gap-3
        ${
          isUser
            ? 'justify-end'
            : 'justify-start'
        }
      `}
    >
      {!isUser && (
        <div
          className="
            mt-1
            h-8
            w-8
            shrink-0
            rounded-xl

            flex
            items-center
            justify-center

            bg-gradient-to-br
            from-blue-500
            to-cyan-400
          "
        >
          <Bot
            className="
              h-4
              w-4
              text-white
            "
          />
        </div>
      )}

      <div
        className={`
          relative
          group

          max-w-[85%]
          sm:max-w-[75%]

          rounded-2xl
          px-5
          py-3

          break-words

          ${
            isUser
              ? `
                bg-blue-600
                text-white
              `
              : `
                bg-[#2f2f2f]
                text-white/90
              `
          }
        `}
        style={{
          contain:
            'layout style',
        }}
        title={
          msg.timestamp
            ? new Date(
                msg.timestamp
              ).toLocaleString()
            : undefined
        }
      >
        {!isUser &&
          msg.text && (
            <button
              onClick={
                handleCopy
              }
              aria-label={
                copied
                  ? 'Copied'
                  : isStreaming
                    ? 'Copy partial response'
                    : 'Copy message'
              }
              className="
                absolute
                top-2
                right-2

                opacity-0
                group-hover:opacity-100

                transition-opacity

                p-1.5
                rounded-lg

                bg-white/10
                hover:bg-white/20
              "
            >
              {copied ? (
                <Check
                  className="
                    h-3.5
                    w-3.5
                    text-emerald-400
                  "
                />
              ) : (
                <Copy
                  className="
                    h-3.5
                    w-3.5
                    text-white/70
                  "
                />
              )}
            </button>
          )}

        <div
          className="
            text-sm
            leading-relaxed
            whitespace-pre-wrap
            break-words
          "
        >
          {!isUser &&
          isStreaming &&
          msg.text ===
            '' ? (
            <span
              className="
                inline-block
                w-[2px]
                h-5
                rounded-full
                bg-blue-400
              "
            />
          ) : (
            <>
              {msg.text}

              {showCursor && (
                <Cursor />
              )}
            </>
          )}
        </div>
      </div>

      {isUser && (
        <div
          className="
            mt-1
            h-8
            w-8
            shrink-0
            rounded-xl

            bg-white/10

            flex
            items-center
            justify-center
          "
        >
          <span
            className="
              text-sm
              font-bold
              text-blue-400
            "
          >
            B
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(
  ChatMessageComponent,
  (prev, next) =>
    prev.msg.id ===
      next.msg.id &&
    prev.msg.text ===
      next.msg.text &&
    prev.msg.role ===
      next.msg.role &&
    prev.msg.timestamp ===
      next.msg.timestamp &&
    prev.isStreaming ===
      next.isStreaming &&
    prev.isLast ===
      next.isLast
);
