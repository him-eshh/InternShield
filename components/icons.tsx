// Thin wrappers so older call sites keep their names; everything is lucide-react at one stroke width (1.75).
// Decorative by default (lucide sets aria-hidden when there is no label).
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleCheck,
  Copy,
  ExternalLink,
  Info,
  LoaderCircle,
  Monitor,
  Moon,
  OctagonAlert,
  Sun,
  TriangleAlert,
  Upload,
  X,
  type LucideProps,
} from "lucide-react";

type P = Omit<LucideProps, "strokeWidth">;
const STROKE = 1.75;
const wrap = (Icon: React.ComponentType<LucideProps>, base = 20) =>
  function WrappedIcon({ size = base, ...rest }: P) {
    return <Icon size={size} strokeWidth={STROKE} {...rest} />;
  };

export const CheckIcon = wrap(Check);
export const CheckCircleIcon = wrap(CircleCheck);
export const WarningIcon = wrap(TriangleAlert);
export const AlertIcon = wrap(OctagonAlert);
export const InfoIcon = wrap(Info);
export const ArrowLeftIcon = wrap(ArrowLeft);
export const ChevronIcon = wrap(ChevronDown);
export const ExternalIcon = wrap(ExternalLink);
export const CopyIcon = wrap(Copy);
export const UploadIcon = wrap(Upload);
export const CloseIcon = wrap(X);
export const SunIcon = wrap(Sun);
export const MoonIcon = wrap(Moon);
export const MonitorIcon = wrap(Monitor);

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} strokeWidth={2.25} aria-hidden="true" className={`animate-spin ${className}`} />;
}
