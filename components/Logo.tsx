/** The ring mark: three arcs, one per tool (Check coral, Tailor teal, Practice violet), around a tick.
 *  Pass `color` for a one-color mark; `tri` for explicit arc colors where CSS variables don't exist (OG, icons). */
export function RingMark({ size = 24, color, tri }: { size?: number; color?: string; tri?: [string, string, string] }) {
  const arcs = tri ?? (color ? [color, color, color] : ["var(--coral)", "var(--teal)", "var(--violet)"]);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {arcs.map((c, i) => (
        <circle key={i} cx="16" cy="16" r="12" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="19 56.4" transform={`rotate(${-80 + i * 120} 16 16)`} />
      ))}
      <path d="M11 16.5l3.5 3.5 6.5-7.5" stroke={color ?? "var(--fg)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-[19px] font-bold tracking-[-0.02em]">
      <RingMark size={26} />
      <span className="max-sm:sr-only">InternShield</span>
    </span>
  );
}
