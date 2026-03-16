import type { FormEvent } from "react";
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
  return (
    <div className='relative h-[500px] min-h-0 md:h-auto'>
      <div className='absolute inset-0 rise flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--panel)]'>
        <div className='border-b border-[var(--border)] px-4 py-3 md:px-5'>
          <h2 className='text-lg text-[var(--ink)]'>Chat</h2>
        </div>

        <div className='flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4 md:px-5'>
          {messages.map((message) => (
            <article
              key={message.id}
              className={`rise max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed md:max-w-[84%] ${
                message.role === "assistant"
                  ? "bg-[#14223f] text-[var(--ink)]"
                  : "ml-auto whitespace-pre-line bg-[#1f335c] text-[#d7e6ff]"
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
            <article className='rise max-w-[90%] rounded-2xl bg-[#14223f] px-4 py-3 text-sm text-[var(--ink)] md:max-w-[84%]'>
              Thinking...
            </article>
          ) : null}
        </div>

        <form
          className='border-t border-[var(--border)] p-3 md:p-4'
          onSubmit={onSubmit}>
          <div className='flex items-end gap-2'>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              placeholder='Ask about scheduling, refill check-ins, or office details...'
              className='w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--brand)]'
            />
            <button
              type='submit'
              className='rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[#08101f] transition hover:bg-[var(--brand-strong)]'>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
