import { useId } from "react";

interface IconProps {
  className?: string;
}

export function CyberShieldIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L54 12 V28 C54 44 45 54 32 60 C19 54 10 44 10 28 V12 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path d="M32 16 V32 M32 32 L23 26 M32 32 L41 26" stroke="rgba(6,20,20,0.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="40" r="3.4" fill="rgba(6,20,20,0.85)" />
    </svg>
  );
}

export function RhythmBladeIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill={`url(#${id}-g)`} opacity="0.18" />
      <path
        d="M14 44 L42 16 L48 22 L20 50 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M42 16 L48 10 M48 22 L54 16" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 30 Q16 22 22 30 T34 30" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function VelocityDriftIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M6 24 H26 M4 32 H30 M6 40 H22" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M26 40 L30 26 C31 22 34 20 38 20 H46 C50 20 53 23 54 27 L56 36 C57 40 54 44 50 44 H30 C27 44 25 42 26 40 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
      />
      <circle cx="34" cy="44" r="4.5" fill="rgba(10,10,15,0.85)" stroke="white" strokeWidth="1.5" />
      <circle cx="50" cy="44" r="4.5" fill="rgba(10,10,15,0.85)" stroke="white" strokeWidth="1.5" />
      <rect x="38" y="26" width="10" height="6" rx="1.5" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

export function GravityFlipIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="27" stroke={`url(#${id}-g)`} strokeWidth="3" strokeDasharray="8 7" fill="none" />
      <path d="M32 14 V50 M32 14 L26 21 M32 14 L38 21" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 50 L26 43 M32 50 L38 43" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FakeItFastIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="27" cy="27" r="16" fill={`url(#${id}-g)`} opacity="0.22" />
      <circle cx="27" cy="27" r="16" stroke={`url(#${id}-g)`} strokeWidth="3.5" fill="none" />
      <path d="M47 47 L58 58" stroke={`url(#${id}-g)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M20 24c1-3 4-4 7-3M27 32c2 1 5 0 6-2" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function IronDomeIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L54 12 V28 C54 44 45 54 32 60 C19 54 10 44 10 28 V12 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path d="M32 46 L26 24 L32 18 L38 24 Z" fill="rgba(255,255,255,0.9)" />
      <path d="M20 30 Q32 22 44 30" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function ClickerIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="26" r="16" fill={`url(#${id}-g)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <text x="38" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill="rgba(30,15,0,0.75)">+1</text>
      <path
        d="M18 30 L18 46 Q18 52 24 52 H30 Q34 52 34 47 V38 L28 40 L24 33 Q22 30 18 30 Z"
        fill="#fef3c7"
        stroke="rgba(120,70,0,0.5)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ColorIdentifyIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="20" height="20" rx="4" fill="#2dd4bf" opacity="0.85" />
      <rect x="36" y="8" width="20" height="20" rx="4" fill="#2dd4bf" opacity="0.85" />
      <rect x="8" y="36" width="20" height="20" rx="4" fill="#2dd4bf" opacity="0.85" />
      <rect x="36" y="36" width="20" height="20" rx="4" fill={`url(#${id}-g)`} stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

export function FruitMergeIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="38" r="14" fill="#fb7185" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <circle cx="42" cy="26" r="18" fill={`url(#${id}-g)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <path d="M40 10c1-3 3-4 5-4" stroke="#4d7c0f" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="20" r="4" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

export function MergeTycoonIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path d="M10 26 L14 12 H50 L54 26 Z" fill={`url(#${id}-g)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 26v24a2 2 0 002 2h36a2 2 0 002-2V26" fill="#fde68a" stroke="rgba(120,53,15,0.3)" strokeWidth="1.5" />
      <path d="M24 52V38a2 2 0 012-2h12a2 2 0 012 2v14" fill="#f97316" opacity="0.85" />
      <path d="M10 26 h44 M20 26 v-6 M30 26 v-8 M40 26 v-6" stroke="rgba(120,53,15,0.35)" strokeWidth="1.5" />
    </svg>
  );
}

export function WobbleRaceIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M6 50 H58" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="30" cy="34" rx="20" ry="17" fill={`url(#${id}-g)`} stroke="rgba(120,53,15,0.4)" strokeWidth="1.5" />
      <circle cx="24" cy="30" r="2.6" fill="#78350f" />
      <circle cx="36" cy="30" r="2.6" fill="#78350f" />
      <path d="M24 40 Q30 46 36 40" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M44 14 L52 10 M46 20 L56 18" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="53" cy="9" r="4.5" fill="#ef4444" />
    </svg>
  );
}

export function RopeSwingIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="10" r="5" fill="#78350f" />
      <path d="M16 15 Q30 30 42 46" stroke="#92400e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="42" cy="46" r="11" fill={`url(#${id}-g)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <path d="M8 46 Q30 58 56 40" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
    </svg>
  );
}

export function WordLadderIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect x="6" y="14" width="14" height="14" rx="3" fill="#34d399" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <rect x="25" y="14" width="14" height="14" rx="3" fill="#fbbf24" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <rect x="44" y="14" width="14" height="14" rx="3" fill="#475569" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <rect x="15" y="36" width="14" height="14" rx="3" fill={`url(#${id}-g)`} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <rect x="34" y="36" width="14" height="14" rx="3" fill="#34d399" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
    </svg>
  );
}

export function CityFindIcon({ className }: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-g`} x1="8" y1="4" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="26" r="22" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
      <path d="M10 26h44M32 4c8 6 8 16 8 22s0 16-8 22c-8-6-8-16-8-22s0-16 8-22z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />
      <path
        d="M32 14 C22 14 16 21 16 29 C16 40 32 54 32 54 C32 54 48 40 48 29 C48 21 42 14 32 14 Z"
        fill={`url(#${id}-g)`}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="28" r="6.5" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}
