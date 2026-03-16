import type { FormEvent } from "react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";

interface ChatWindowProps {
  messages: Message[];
  isAiResponding: boolean;
  input: string;
  setInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ChatWindow({
  messages,
  isAiResponding,
  input,
  setInput,
  onSubmit,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiResponding]);

  return (
    <div className='relative h-[500px] min-h-0 md:h-auto'>
      <div className='absolute inset-0 rise flex flex-col rounded-2xl border border-gray-200 bg-white'>
        <div className='border-b border-gray-200 px-4 py-3 md:px-5'>
          <h2 className='text-lg text-gray-900'>Chat</h2>
        </div>

        <div className='flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4 md:px-5'>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rise max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[84%] ${
                message.role === "assistant"
                  ? "bg-gray-50 border border-gray-200 text-gray-900"
                  : "ml-auto whitespace-pre-line bg-blue-600 text-white"
              }`}>
              {message.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                message.text
              )}
            </article>
          ))}
          {isAiResponding ? (
            <article className='rise max-w-[90%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 md:max-w-[84%]'>
              Thinking...
            </article>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <form
          className='border-t border-gray-200 p-3 md:p-4'
          onSubmit={onSubmit}>
          <div className='flex items-end gap-2'>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              placeholder='Ask about scheduling, refill check-ins, or office details...'
              className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600'
            />
            <button
              type='submit'
              className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
