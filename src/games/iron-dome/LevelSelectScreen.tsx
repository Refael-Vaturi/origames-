import React, { useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Check } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

const TOTAL_LEVELS = 10000;
const COLS = 3;
const TOTAL_ROWS = Math.ceil(TOTAL_LEVELS / COLS);

interface LevelSelectScreenProps {
  maxUnlocked: number; // highest level the player has reached
  onSelectLevel: (level: number) => void;
  onBack: () => void;
  T: (key: string) => string;
}

const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ maxUnlocked, onSelectLevel, onBack, T }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: TOTAL_ROWS,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 10,
  });

  // Memoize LEGO stud pattern via CSS
  const legoStudStyle = useMemo(() => ({
    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 8px, transparent 8px)`,
    backgroundSize: '40px 40px',
    backgroundPosition: '0 0, 20px 20px',
  }), []);

  const renderTile = useCallback((level: number) => {
    const isUnlocked = level <= maxUnlocked;
    const isCompleted = level < maxUnlocked;
    const isCurrent = level === maxUnlocked;

    if (level > TOTAL_LEVELS) return <div key={`empty-${level}`} className="w-full aspect-square" />;

    return (
      <motion.button
        key={level}
        whileTap={isUnlocked ? { scale: 0.9 } : {}}
        onClick={() => isUnlocked && onSelectLevel(level)}
        disabled={!isUnlocked}
        className={`relative w-full aspect-square rounded-2xl border-2 font-bold text-lg transition-all flex flex-col items-center justify-center gap-1 ${
          isCompleted
            ? 'bg-gradient-to-br from-green-600/60 to-emerald-700/60 border-green-400/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]'
            : isCurrent
            ? 'bg-gradient-to-br from-cyan-600/70 to-blue-700/70 border-cyan-400/60 text-white shadow-[0_0_20px_rgba(0,200,255,0.3)] animate-pulse'
            : 'bg-black/40 border-white/10 text-white/25 cursor-not-allowed'
        }`}
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {/* LEGO stud on tile */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-white/10 bg-white/5" />
        </div>

        {!isUnlocked && <Lock className="w-5 h-5 text-white/20" />}
        {isCompleted && <Check className="w-5 h-5 text-green-300" />}
        <span className={`text-xl ${!isUnlocked ? 'text-white/20' : ''}`}>{level}</span>
      </motion.button>
    );
  }, [maxUnlocked, onSelectLevel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #0a3d6b 0%, #1565a0 30%, #0d47a1 60%, #0a3068 100%)',
      }}
    >
      {/* Animated LEGO stud background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={legoStudStyle}
        animate={{ backgroundPosition: ['0 0', '20px 20px'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Depth/glow overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(100,180,255,0.15)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Courier New', monospace" }}>
            🎯 {T('selectLevel')}
          </h2>
          <p className="text-cyan-300/50 text-xs">{T('campaign')} · {maxUnlocked - 1}/{TOTAL_LEVELS} ✅</p>
        </div>
        <div className="w-12" /> {/* spacer */}
      </div>

      {/* Scrollable level grid - virtualized */}
      <div
        ref={parentRef}
        className="relative z-10 flex-1 overflow-y-auto px-3 py-3"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const startLevel = virtualRow.index * COLS + 1;
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-3 gap-2 px-1"
              >
                {Array.from({ length: COLS }, (_, col) => {
                  const level = startLevel + col;
                  return renderTile(level);
                })}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default LevelSelectScreen;
