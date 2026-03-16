import type { ReactElement } from "react";

interface HeaderProps {
  handleVoiceHandoff: () => void;
}

export function Header({ handleVoiceHandoff }: HeaderProps): ReactElement {
  return (
    <header className='rise mb-4 rounded-2xl border border-[var(--border)] bg-[color:var(--panel)] p-4 shadow-[0_10px_40px_rgb(0_0_0_/_0.35)] md:p-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)]'>
            Kyron Medical
          </p>
          <h1 className='mt-2 text-2xl leading-tight text-[var(--ink)] md:text-3xl'>
            Patient Assistant
          </h1>
        </div>
        <button
          type='button'
          onClick={handleVoiceHandoff}
          className='rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-[#08101f] transition hover:bg-[var(--brand-strong)]'>
          Continue on Phone
        </button>
      </div>
    </header>
  );
}
