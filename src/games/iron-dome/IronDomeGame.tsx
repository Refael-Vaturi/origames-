import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Infinity as InfinityIcon, BookOpen, Trophy, Volume2, VolumeX, Music, Pause } from 'lucide-react';
import {
  createInitialState, startWave, fireInterceptor, update, nextWave,
  buyStoreItem, activateAirSupport, activateGPSJammer, renderGame,
} from './engine';
import { GameState, GamePhase } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t as ironT } from './i18n';
import LanguageSelector from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';

const IronDomeGame: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const { user } = useAuth();
  const { language } = useLanguage();

  const T = useCallback((key: string) => ironT(key, language), [language]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!stateRef.current || stateRef.current.phase === 'menu') {
        stateRef.current = createInitialState(canvas.width, canvas.height);
        setGameState(stateRef.current);
        setPhase('menu');
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      const dt = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;

      if (stateRef.current) {
        stateRef.current = update(stateRef.current, dt, canvas.width, canvas.height, time);

        if (stateRef.current.phase !== phase) {
          setPhase(stateRef.current.phase);
          setGameState({ ...stateRef.current });
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderGame(ctx, stateRef.current, canvas.width, canvas.height, time);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // Click to fire
  const handleCanvasClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!stateRef.current || stateRef.current.phase !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let x: number, y: number;
    if ('touches' in e) {
      const touch = e.touches[0] || (e as any).changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      const rect = canvas.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    if (y > canvas.height * 0.85) return;

    stateRef.current = fireInterceptor(stateRef.current, x, y, canvas.width, canvas.height);
    playSound('fire');
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!stateRef.current) return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (stateRef.current.phase === 'playing') {
          stateRef.current.phase = 'paused';
          setPhase('paused');
        } else if (stateRef.current.phase === 'paused') {
          stateRef.current.phase = 'playing';
          setPhase('playing');
        }
      }

      if (stateRef.current.phase !== 'playing') return;

      if (e.key === 'a' || e.key === 'A') {
        stateRef.current = activateAirSupport(stateRef.current);
        playSound('airstrike');
      }
      if (e.key === 'g' || e.key === 'G') {
        if (canvasRef.current) {
          stateRef.current = activateGPSJammer(stateRef.current, canvasRef.current.width);
        }
        playSound('jammer');
      }
      if (e.key === 'b' || e.key === 'B') {
        if (stateRef.current.storeItems.find(i => i.id === 'iron-beam' && i.bought > 0)) {
          stateRef.current.ironBeamActive = !stateRef.current.ironBeamActive;
          playSound('beam');
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (canvasRef.current) {
          stateRef.current = fireInterceptor(
            stateRef.current,
            canvasRef.current.width / 2,
            canvasRef.current.height * 0.4,
            canvasRef.current.width,
            canvasRef.current.height
          );
          playSound('fire');
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const playSound = (type: string) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      switch (type) {
        case 'fire':
          osc.frequency.value = 800;
          gain.gain.value = 0.08;
          osc.type = 'sine';
          osc.start();
          osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          osc.stop(audioCtx.currentTime + 0.15);
          break;
        case 'airstrike':
          osc.frequency.value = 300;
          gain.gain.value = 0.1;
          osc.type = 'sawtooth';
          osc.start();
          osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.stop(audioCtx.currentTime + 0.5);
          break;
        case 'jammer':
          osc.frequency.value = 1200;
          gain.gain.value = 0.06;
          osc.type = 'square';
          osc.start();
          osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          osc.stop(audioCtx.currentTime + 0.3);
          break;
        case 'beam':
          osc.frequency.value = 2000;
          gain.gain.value = 0.05;
          osc.type = 'sine';
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
          osc.stop(audioCtx.currentTime + 0.2);
          break;
      }
    } catch {}
  };

  const startGame = (mode: 'campaign' | 'survival') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = createInitialState(canvas.width, canvas.height);
    s.mode = mode;
    stateRef.current = startWave(s, canvas.width, canvas.height);
    setPhase(stateRef.current.phase);
    setGameState({ ...stateRef.current });
  };

  const handleNextWave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    stateRef.current = nextWave(stateRef.current, canvas.width, canvas.height);
    setPhase(stateRef.current.phase);
    setGameState({ ...stateRef.current });
  };

  const handleBuyItem = (itemId: string) => {
    if (!stateRef.current) return;
    stateRef.current = buyStoreItem(stateRef.current, itemId);
    setGameState({ ...stateRef.current });
  };

  const handleRestart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stateRef.current = createInitialState(canvas.width, canvas.height);
    setPhase('menu');
    setGameState(stateRef.current);
  };

  const handleResume = () => {
    if (!stateRef.current) return;
    stateRef.current.phase = 'playing';
    setPhase('playing');
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
      />

      {/* Top-right controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-30">
        {phase === 'menu' && (
          <div className="[&_button]:bg-black/40 [&_button]:border [&_button]:border-white/10 [&_button]:backdrop-blur-sm">
            <LanguageSelector />
          </div>
        )}
        <button onClick={() => setMusicEnabled(!musicEnabled)} className="p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-colors">
          <Music className="w-4 h-4" style={{ opacity: musicEnabled ? 1 : 0.3 }} />
        </button>
        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-colors">
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu Overlay */}
      <AnimatePresence>
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
            <div className="relative z-10 flex flex-col items-center gap-4 px-4 max-w-md w-full">
              {/* Back button */}
              <button
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-semibold">{T('backToMenu')}</span>
              </button>

              <motion.h1
                className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl"
                style={{ fontFamily: "'Courier New', monospace" }}
                animate={{ textShadow: ['0 0 20px rgba(0,200,255,0.5)', '0 0 40px rgba(0,200,255,0.3)', '0 0 20px rgba(0,200,255,0.5)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {T('title')}
              </motion.h1>
              <p className="text-cyan-200/60 text-sm tracking-widest">{T('subtitle')}</p>

              <div className="flex flex-col gap-3 w-full mt-6">
                <MenuButton icon={<Play className="w-5 h-5" />} label={T('campaign')} sub={T('play10waves')} onClick={() => startGame('campaign')} color="cyan" />
                <MenuButton icon={<InfinityIcon className="w-5 h-5" />} label={T('survival')} sub={T('howLong')} onClick={() => startGame('survival')} color="blue" />

                <div className="flex gap-3 mt-2">
                  <MenuButtonSmall icon="📖" label={T('rules')} onClick={() => {
                    if (stateRef.current) {
                      stateRef.current.phase = 'rules';
                      setPhase('rules');
                    }
                  }} />
                  <MenuButtonSmall icon="🏆" label={T('leaderboard')} onClick={() => {}} />
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 px-4 py-3 bg-black/40 rounded-xl border border-cyan-900/30 text-center">
                <p className="text-cyan-400/40 text-xs">{T('playersWorldwide')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wave Intro */}
      <AnimatePresence>
        {phase === 'wave-intro' && gameState && (
          <motion.div
            key="wave-intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="text-center">
              <motion.p
                className="text-6xl md:text-8xl font-bold text-cyan-400"
                style={{ fontFamily: "'Courier New', monospace", textShadow: '0 0 40px rgba(0,200,255,0.5)' }}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
              >
                {T('wave')} {gameState.wave}
              </motion.p>
              <motion.p
                className="text-cyan-300/50 text-lg mt-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {gameState.mode === 'campaign'
                  ? `${gameState.wave} / 10`
                  : T('surviveAsLong')}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wave Clear */}
      <AnimatePresence>
        {phase === 'wave-clear' && gameState && (
          <motion.div
            key="wave-clear"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <motion.p
              className="text-4xl font-bold text-green-400"
              style={{ textShadow: '0 0 30px rgba(0,255,100,0.5)' }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
            >
              ✅ {T('waveCleared')}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause */}
      <AnimatePresence>
        {phase === 'paused' && (
          <motion.div
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60"
          >
            <Pause className="w-16 h-16 text-white/60 mb-4" />
            <p className="text-2xl font-bold text-white mb-6">{T('paused')}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleResume} className="px-8 py-3 bg-cyan-600/80 text-white rounded-xl font-bold hover:bg-cyan-500 transition-colors">
                {T('resume')}
              </button>
              <button onClick={handleRestart} className="px-8 py-3 bg-white/10 text-white/70 rounded-xl font-bold hover:bg-white/20 transition-colors">
                {T('quitToMenu')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Store */}
      <AnimatePresence>
        {phase === 'store' && gameState && (
          <motion.div
            key="store"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/70"
          >
            <div className="bg-[#0a1525] border border-cyan-900/40 rounded-2xl p-6 max-w-sm w-full mx-4">
              <h2 className="text-2xl font-bold text-cyan-400 text-center mb-1" style={{ fontFamily: "'Courier New', monospace" }}>{T('store')}</h2>
              <p className="text-cyan-300/40 text-xs text-center mb-4">{T('waveCompleted').replace('{n}', String(gameState.wave))}</p>
              <p className="text-green-400 text-center text-sm mb-4">💰 {T('credits')}: {gameState.credits}</p>

              <div className="flex flex-col gap-2 mb-4">
                {gameState.storeItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleBuyItem(item.id)}
                    disabled={item.bought >= item.maxBuys || gameState.credits < item.cost}
                    className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-cyan-900/20 hover:border-cyan-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-left"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">{item.name}</p>
                      <p className="text-cyan-300/50 text-xs">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 text-sm font-bold">{item.cost} 💰</p>
                      <p className="text-cyan-300/30 text-xs">{item.bought}/{item.maxBuys}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextWave}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
              >
                {T('nextWave')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {phase === 'game-over' && gameState && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80"
          >
            <motion.div
              className="bg-[#0a1525] border border-red-900/40 rounded-2xl p-6 max-w-sm w-full mx-4 text-center"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <motion.h2
                className="text-3xl font-bold text-red-400 mb-2"
                style={{ fontFamily: "'Courier New', monospace" }}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {T('missionFailed')}
              </motion.h2>
              <div className="text-5xl font-bold text-yellow-400 my-4">{gameState.score}</div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-yellow-400 text-lg font-bold">{gameState.wave}</p>
                  <p className="text-cyan-300/40 text-xs">{T('wave')}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-green-400 text-lg font-bold">{gameState.totalIntercepted}</p>
                  <p className="text-cyan-300/40 text-xs">{T('intercepted')}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-orange-400 text-lg font-bold">x{gameState.maxCombo}</p>
                  <p className="text-cyan-300/40 text-xs">{T('maxCombo')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleRestart} className="flex-1 py-3 bg-red-600/60 text-white rounded-xl font-bold hover:bg-red-500/60 transition-colors">
                  {T('menu')}
                </button>
                <button onClick={() => startGame(gameState.mode)} className="flex-1 py-3 bg-cyan-600/80 text-white rounded-xl font-bold hover:bg-cyan-500 transition-colors">
                  {T('retry')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory */}
      <AnimatePresence>
        {phase === 'victory' && gameState && (
          <motion.div
            key="victory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80"
          >
            <motion.div
              className="bg-[#0a1525] border border-yellow-600/40 rounded-2xl p-6 max-w-sm w-full mx-4 text-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <motion.div
                className="text-5xl mb-2"
                animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                🏆
              </motion.div>
              <h2 className="text-3xl font-bold text-yellow-400 mb-1" style={{ fontFamily: "'Courier New', monospace" }}>
                {T('victory')}
              </h2>
              <p className="text-cyan-300/50 text-sm mb-4">{T('all10waves')}</p>
              <div className="text-5xl font-bold text-yellow-400 my-4">{gameState.score}</div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-green-400 text-lg font-bold">{gameState.totalIntercepted}</p>
                  <p className="text-cyan-300/40 text-xs">{T('intercepted')}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-orange-400 text-lg font-bold">x{gameState.maxCombo}</p>
                  <p className="text-cyan-300/40 text-xs">{T('maxCombo')}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-2">
                  <p className="text-red-400 text-lg font-bold">{gameState.totalMissed}</p>
                  <p className="text-cyan-300/40 text-xs">{T('missed')}</p>
                </div>
              </div>

              <button onClick={handleRestart} className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-500 transition-all">
                {T('backToMenu')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules */}
      <AnimatePresence>
        {phase === 'rules' && (
          <motion.div
            key="rules"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 overflow-y-auto py-8"
          >
            <div className="bg-[#0a1525] border border-cyan-900/40 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-cyan-400 text-center mb-1" style={{ fontFamily: "'Courier New', monospace" }}>{T('howToPlay')}</h2>
              <p className="text-cyan-300/50 text-sm text-center mb-4">{T('defendCities')}</p>

              <RuleSection label={T('objective')} icon="🛡">
                {T('objectiveDesc')}
              </RuleSection>

              <RuleSection label={T('controls')} icon="🖱">
                {T('controlsDesc')}
              </RuleSection>

              <RuleSection label={T('keyboard')} icon="⌨">
                {T('keyboardDesc')}
              </RuleSection>

              <RuleSection label={T('threats')} icon="🚀">
                <div className="space-y-1 text-xs">
                  <p>🚀 <b>{T('missile')}</b> (100pts) - {T('missileDesc')}</p>
                  <p>✈ <b>{T('uav')}</b> (150pts) - {T('uavDesc')}</p>
                  <p>💣 <b>{T('cluster')}</b> (300pts) - {T('clusterDesc')}</p>
                  <p>💥 <b>{T('submunition')}</b> (75pts) - {T('submunitionDesc')}</p>
                  <p>☢ <b>{T('heavy')}</b> (250pts) - {T('heavyDesc')}</p>
                </div>
              </RuleSection>

              <RuleSection label={T('comboSystem')} icon="✕">
                {T('comboDesc')}
              </RuleSection>

              <button
                onClick={() => {
                  if (stateRef.current) {
                    stateRef.current.phase = 'menu';
                    setPhase('menu');
                  }
                }}
                className="w-full py-3 bg-cyan-600/60 text-white rounded-xl font-bold mt-4 hover:bg-cyan-500/60 transition-colors"
              >
                {T('gotIt')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause button during gameplay */}
      {phase === 'playing' && (
        <button
          onClick={() => {
            if (stateRef.current) {
              stateRef.current.phase = 'paused';
              setPhase('paused');
            }
          }}
          className="absolute top-3 left-3 z-30 p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white"
        >
          <Pause className="w-4 h-4" />
        </button>
      )}

      {/* Bottom info bar during gameplay */}
      {phase === 'playing' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-white/30 text-[10px] font-mono pointer-events-none">
          🚀 {T('missile')} · ✈ {T('uav')} · 💣 {T('cluster')} (7s!) · ☢ {T('heavy')} (2 hits!) · ESC = {T('paused')}
        </div>
      )}
    </div>
  );
};

// Helper components
const MenuButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  color: string;
}> = ({ icon, label, sub, onClick, color }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`flex items-center gap-4 w-full px-5 py-4 rounded-xl border transition-all
      ${color === 'cyan'
        ? 'bg-cyan-900/30 border-cyan-600/40 hover:border-cyan-400/60 hover:bg-cyan-800/30'
        : 'bg-blue-900/30 border-blue-600/40 hover:border-blue-400/60 hover:bg-blue-800/30'
      }`}
  >
    <span className="text-white/80">{icon}</span>
    <div className="text-left">
      <p className="text-white font-bold text-lg">{label}</p>
      <p className="text-cyan-300/50 text-xs">{sub}</p>
    </div>
  </motion.button>
);

const MenuButtonSmall: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white/70 transition-all"
  >
    <span>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </motion.button>
);

const RuleSection: React.FC<{
  label: string;
  icon: string;
  children: React.ReactNode;
}> = ({ label, icon, children }) => (
  <div className="mb-3">
    <p className="text-cyan-400/60 text-[10px] font-bold tracking-wider mb-1">{label}</p>
    <div className="flex gap-2 items-start">
      <span className="text-sm">{icon}</span>
      <div className="text-cyan-100/70 text-xs leading-relaxed">{children}</div>
    </div>
  </div>
);

export default IronDomeGame;
