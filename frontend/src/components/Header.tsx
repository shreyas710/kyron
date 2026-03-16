import type { ReactElement } from "react";

interface HeaderProps {
  handleVoiceHandoff: () => void;
}

export function Header({ handleVoiceHandoff }: HeaderProps): ReactElement {
  return (
    <header className='rise mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_40px_rgb(0_0_0_/_0.05)] md:p-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.22em] text-blue-600'>
            Kyron Medical
          </p>
          <h1 className='mt-2 text-2xl leading-tight text-gray-900 md:text-3xl'>
            Patient Assistant
          </h1>
        </div>
        <button
          type='button'
          onClick={handleVoiceHandoff}
          className='rounded-xl border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700'>
          Continue on Phone
        </button>
      </div>
    </header>
  );
}
