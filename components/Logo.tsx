/** The ring mark: the report's risk ring with its check ticks. Shared by the header, the OG image and the icons. */
export function RingMark({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="11" stroke={color} strokeWidth="3" opacity="0.25" />
      <circle cx="16" cy="16" r="11" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="48 69.1" transform="rotate(-90 16 16)" />
      <path d="M16 2.5V.8M22.75 4.3l.85-1.47M27.7 9.25l1.47-.85M29.5 16h1.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
      <span className="text-accent">
        <RingMark />
      </span>
      <span className="max-sm:sr-only">InternShield</span>
    </span>
  );
}
