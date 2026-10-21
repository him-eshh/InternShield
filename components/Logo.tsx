import { ShieldIcon } from "./icons";

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em]">
      <span className="text-accent">
        <ShieldIcon size={24} />
      </span>
      <span className="max-sm:sr-only">InternShield</span>
    </span>
  );
}
