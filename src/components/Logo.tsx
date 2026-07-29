import { useRouter } from '../lib/router';

export function Logo({ compact = false }: { compact?: boolean }) {
  const { navigate } = useRouter();
  return (
    <button
      onClick={() => navigate({ name: 'landing' })}
      className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
    >
      <LogoMark size={32} />
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-ink-900 dark:text-white">
          Scholar<span className="text-brand-500">AI</span>
        </span>
      )}
    </button>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2447f5" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* Rounded square base */}
      <rect width="48" height="48" rx="11" fill="url(#logoGrad)" />
      {/* Open book — left page */}
      <path
        d="M10 16 C10 15 11 14 12 14 L22 15.5 L22 35 L12 33.5 C11 33.5 10 32.5 10 31.5 Z"
        fill="white"
        opacity="0.95"
      />
      {/* Open book — right page */}
      <path
        d="M38 16 C38 15 37 14 36 14 L26 15.5 L26 35 L36 33.5 C37 33.5 38 32.5 38 31.5 Z"
        fill="white"
        opacity="0.7"
      />
      {/* Book spine */}
      <rect x="22" y="13.5" width="4" height="22" rx="1" fill="white" opacity="0.35" />
      {/* AI sparkle — top right */}
      <path
        d="M34.5 8 L35.4 10.6 L38 11.5 L35.4 12.4 L34.5 15 L33.6 12.4 L31 11.5 L33.6 10.6 Z"
        fill="white"
        opacity="0.95"
      />
      {/* Small dot */}
      <circle cx="39.5" cy="8" r="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}
