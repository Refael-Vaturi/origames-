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
