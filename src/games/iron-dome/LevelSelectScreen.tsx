import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

const TOTAL_LEVELS = 10000;

const useResponsiveCols = () => {
  const [cols, setCols] = useState(() => {
    const w = window.innerWidth;
    if (w >= 1200) return 8;
    if (w >= 900) return 6;
    if (w >= 600) return 5;
    if (w >= 450) return 4;
    return 3;
  });

  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      if (w >= 1200) setCols(8);
      else if (w >= 900) setCols(6);
      else if (w >= 600) setCols(5);
      else if (w >= 450) setCols(4);
      else setCols(3);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return cols;
};

interface LevelSelectScreenProps {
  maxUnlocked: number;
  stars?: Record<number, number>;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
  T: (key: string) => string;
}

const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({ maxUnlocked, stars = {}, onSelectLevel, onBack, T }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const cols = useResponsiveCols();
  const totalRows = Math.ceil(TOTAL_LEVELS / cols);
  const [searchValue, setSearchValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null);

  const estimateRowSize = useCallback(() => {
    const w = window.innerWidth;
    const maxW = Math.min(w, 1200);
    const gap = 8;
    const padding = 16;
    const tileW = (maxW - padding * 2 - gap * (cols - 1)) / cols;
    return Math.min(tileW, 120) + gap;
  }, [cols]);

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowSize,
    overscan: 10,
  });

  // Auto-scroll to current level on mount
  useEffect(() => {
    const targetRow = Math.floor((maxUnlocked - 1) / cols);
    const timer = setTimeout(() => {
      rowVirtualizer.scrollToIndex(Math.max(0, targetRow - 1), { align: 'start', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [maxUnlocked, cols]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(1, Math.min(level, TOTAL_LEVELS));
    const targetRow = Math.floor((clampedLevel - 1) / cols);
    rowVirtualizer.scrollToIndex(targetRow, { align: 'center', behavior: 'smooth' });
  }, [cols, rowVirtualizer]);

  const handleSearchSubmit = useCallback(() => {
    const num = parseInt(searchValue);
    if (num >= 1 && num <= TOTAL_LEVELS) {
      scrollToLevel(num);
      setSearchValue('');
      setShowSearch(false);
    }
  }, [searchValue, scrollToLevel]);

  const handleLevelClick = useCallback((level: number, isUnlocked: boolean, isCurrent: boolean) => {
    if (!isUnlocked) return;
    if (isCurrent) {
      // Show unlock animation then start
      setUnlockingLevel(level);
      setTimeout(() => {
        setUnlockingLevel(null);
        onSelectLevel(level);
      }, 1200);
    } else {
      onSelectLevel(level);
    }
  }, [onSelectLevel]);

  const legoStudStyle = useMemo(() => ({
    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 8px, transparent 8px)`,
    backgroundSize: '40px 40px',
    backgroundPosition: '0 0, 20px 20px',
  }), []);

  const renderTile = useCallback((level: number) => {
    const isUnlocked = level <= maxUnlocked;
    const isCompleted = level < maxUnlocked;
    const isCurrent = level === maxUnlocked;
    const levelStars = stars[level] || 0;
    const isUnlocking = unlockingLevel === level;

    if (level > TOTAL_LEVELS) return <div key={`empty-${level}`} className="w-full aspect-square" />;

    return (
      <motion.button
        key={level}
        whileTap={isUnlocked ? { scale: 0.9 } : {}}
        onClick={() => handleLevelClick(level, isUnlocked, isCurrent)}
        disabled={!isUnlocked}
        className={`relative w-full aspect-square rounded-xl sm:rounded-2xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-sm sm:text-lg ${
          isCompleted
            ? 'bg-gradient-to-br from-green-600/60 to-emerald-700/60 border-green-400/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]'
            : isCurrent
            ? 'bg-gradient-to-br from-cyan-600/70 to-blue-700/70 border-cyan-400/60 text-white shadow-[0_0_20px_rgba(0,200,255,0.3)]'
            : 'bg-black/40 border-white/10 text-white/25 cursor-not-allowed'
        }`}
        style={{ fontFamily: "'Courier New', monospace", maxWidth: 120, maxHeight: 120 }}
      >
        {/* Lego stud */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6 rounded-full border border-white/10 bg-white/5" />
        </div>

        {/* Locked levels */}
        {!isUnlocked && <Lock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white/20" />}
        
        {/* Current level - glowing lock */}
        {isCurrent && !isUnlocking && (
          <div className="flex flex-col items-center gap-0.5">
            <motion.div
              animate={{ 
                filter: ['drop-shadow(0 0 4px rgba(0,200,255,0.6))', 'drop-shadow(0 0 12px rgba(0,200,255,0.9))', 'drop-shadow(0 0 4px rgba(0,200,255,0.6))'],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
            </motion.div>
            <span className="text-[8px] sm:text-[10px] text-cyan-300/80 font-bold">{T('tapToUnlock')}</span>
          </div>
        )}

        {/* Unlock animation */}
        <AnimatePresence>
          {isUnlocking && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-10"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ 
                  scale: [1, 1.3, 1.5, 0],
                  rotate: [0, -10, 10, -20, 180],
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              >
                <Lock className="w-8 h-8 text-yellow-400" />
              </motion.div>
              {/* Burst particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-yellow-400"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 8) * 40,
                    y: Math.sin((i * Math.PI * 2) / 8) * 40,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed stars */}
        {isCompleted && (
          <div className="flex gap-0.5">
            {[1, 2, 3].map(i => (
              <motion.span
                key={i}
                className={`text-[10px] sm:text-xs ${i <= levelStars ? 'text-yellow-400' : 'text-white/15'}`}
                initial={levelStars === 3 && i <= 3 ? { scale: 0, rotate: -180 } : {}}
                animate={levelStars === 3 && i <= 3 ? { scale: 1, rotate: 0 } : {}}
                transition={{ delay: i * 0.1, type: 'spring' }}
              >
                ★
              </motion.span>
            ))}
          </div>
        )}
        
        {/* Level number (not on current level with lock) */}
        {!isCurrent && (
          <span className={`text-base sm:text-xl ${!isUnlocked ? 'text-white/20' : ''}`}>{level}</span>
        )}
        {isCurrent && !isUnlocking && (
          <span className="text-xs sm:text-sm text-cyan-200/60">{level}</span>
        )}
      </motion.button>
    );
  }, [maxUnlocked, stars, handleLevelClick, unlockingLevel, T]);

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
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={legoStudStyle}
        animate={{ backgroundPosition: ['0 0', '20px 20px'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(100,180,255,0.15)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-black/30 border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-white truncate" style={{ fontFamily: "'Courier New', monospace" }}>
            🎯 {T('selectLevel')}
          </h2>
          <p className="text-cyan-300/50 text-[10px] sm:text-xs">{T('campaign')} · {maxUnlocked - 1}/{TOTAL_LEVELS} ✅</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-black/30 border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-10 px-3 sm:px-4 py-2 bg-black/20 backdrop-blur-sm border-b border-white/10"
        >
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="number"
              min={1}
              max={TOTAL_LEVELS}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); }}
              placeholder={`1 - ${TOTAL_LEVELS}`}
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-cyan-900/40 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/60"
              dir="ltr"
              autoFocus
            />
            <button
              onClick={handleSearchSubmit}
              className="px-4 py-2 rounded-lg bg-cyan-600/60 text-white text-sm font-bold hover:bg-cyan-500/60 transition-colors"
            >
              🔍
            </button>
          </div>
        </motion.div>
      )}

      {/* Scrollable level grid */}
      <div
        ref={parentRef}
        className="relative z-10 flex-1 overflow-y-auto px-2 sm:px-4 py-3"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const startLevel = virtualRow.index * cols + 1;
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
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gap: '8px',
                  padding: '0 4px',
                  alignItems: 'center',
                  justifyItems: 'center',
                }}
              >
                {Array.from({ length: cols }, (_, col) => {
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
