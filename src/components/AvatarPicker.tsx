import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playClick, playPop } from "@/hooks/useSound";

export const AVATAR_OPTIONS = [
  "🦊", "🐼", "🐯", "🐸", "🐙", "🦄",
  "🐱", "🐶", "🦁", "🐻", "🐨", "🐵",
  "🦋", "🐲", "🦈", "🐺", "🦉", "🐧",
];

interface AvatarPickerProps {
  currentAvatar: string;
  onSelect: (avatar: string) => void;
  disabled?: boolean;
}

const AvatarPicker = ({ currentAvatar, onSelect, disabled }: AvatarPickerProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            playClick();
          }
        }}
        disabled={disabled}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer disabled:cursor-default disabled:opacity-50"
        title="Change avatar"
      >
        {currentAvatar}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute start-0 top-full mt-2 bg-card rounded-2xl shadow-lg border border-border p-3 z-50 w-[200px]"
          >
            <p className="text-xs font-display font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Pick avatar
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATAR_OPTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onSelect(emoji);
                    playPop();
                    setOpen(false);
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors ${
                    currentAvatar === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AvatarPicker;
