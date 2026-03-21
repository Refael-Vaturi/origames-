import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Infinity as InfinityIcon, BookOpen, Trophy, Volume2, VolumeX, Music, Pause, LogIn, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
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
import { GameMusic } from './music';
import { toast } from '@/hooks/use-toast';

const IronDomeGame: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const musicRef = useRef<GameMusic>(new GameMusic());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<'campaign' | 'survival'>('campaign');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [loadingLB, setLoadingLB] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const T = useCallback((key: string) => ironT(key, language), [language]);

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { data: { display_name: authDisplayName || 'Player' }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'נרשמת בהצלחה! בדוק את המייל לאימות' });
        setShowAuthModal(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        toast({ title: 'התחברת בהצלחה!' });
        setShowAuthModal(false);
      }
    } catch (e: any) {
      toast({ title: e.message || 'שגיאה', variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const saveScore = useCallback(async (state: GameState) => {
    if (!user || scoreSaved) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      await supabase.from('iron_dome_scores').insert({
        user_id: user.id,
        display_name: profile?.display_name || 'Player',
        score: state.score,
        wave: state.wave,
        max_combo: state.maxCombo,
        mode: state.mode,
      });
      setScoreSaved(true);
    } catch (e) {
      console.error('Failed to save score:', e);
    }
  }, [user, scoreSaved]);

  const fetchLeaderboard = useCallback(async (mode: 'campaign' | 'survival') => {
    setLoadingLB(true);
    const { data } = await supabase
      .from('iron_dome_scores')
      .select('*')
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(15);
    setLeaderboardData(data || []);
    setLoadingLB(false);
  }, []);

  // Music toggle & cleanup
  useEffect(() => {
    if (musicEnabled && musicRef.current.isPlaying()) {
      musicRef.current.setVolume(0.12);
    } else if (!musicEnabled && musicRef.current.isPlaying()) {
      musicRef.current.setVolume(0);
    }
  }, [musicEnabled]);

  useEffect(() => {
    if ((phase === 'game-over' || phase === 'victory') && musicRef.current.isPlaying()) {
      musicRef.current.stop();
    }
  }, [phase]);

  useEffect(() => {
    return () => { musicRef.current.stop(); };
  }, []);

  // Auto-save score on game over or victory
  useEffect(() => {
    if ((phase === 'game-over' || phase === 'victory') && gameState && user && !scoreSaved) {
      saveScore(gameState);
    }
  }, [phase, gameState, user, scoreSaved, saveScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      if (!stateRef.current || stateRef.current.phase === 'menu') {
        stateRef.current = createInitialState(w, h);
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

      // Use logical (CSS) dimensions, not canvas pixel dimensions
      const logicalW = window.innerWidth;
      const logicalH = window.innerHeight;

      if (stateRef.current) {
        stateRef.current = update(stateRef.current, dt, logicalW, logicalH, time);

        // Process sound events from engine
        if (stateRef.current.soundEvents.length > 0) {
          stateRef.current.soundEvents.forEach(evt => playSoundRef.current(evt));
          stateRef.current.soundEvents = [];
        }

        if (stateRef.current.phase !== phase) {
          setPhase(stateRef.current.phase);
          setGameState({ ...stateRef.current });
          lastStateUpdateRef.current = time;
        } else if (time - lastStateUpdateRef.current > 200) {
          // Throttled update for HUD timers (5x per second)
          setGameState({ ...stateRef.current });
          lastStateUpdateRef.current = time;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderGame(ctx, stateRef.current, logicalW, logicalH, time);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase]);

  // Click to fire
  const handleCanvasClick = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (!stateRef.current || stateRef.current.phase !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const logicalH = window.innerHeight;
    const logicalW = window.innerWidth;
    if (y > logicalH * 0.85) return;

    stateRef.current = fireInterceptor(stateRef.current, x, y, logicalW, logicalH);
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

      // Air support removed - now triggered by pink missile only
      if (e.key === 'g' || e.key === 'G') {
        if (canvasRef.current) {
          stateRef.current = activateGPSJammer(stateRef.current, window.innerWidth);
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
          const lw = window.innerWidth;
          const lh = window.innerHeight;
          stateRef.current = fireInterceptor(
            stateRef.current,
            lw / 2,
            lh * 0.4,
            lw,
            lh
          );
          playSound('fire');
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const playSoundRef = useRef<(type: string) => void>(() => {});
  playSoundRef.current = (type: string) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const g = ctx.createGain();
      g.connect(ctx.destination);

      const makeOsc = (freq: number, oscType: OscillatorType, vol: number, dur: number, endFreq?: number) => {
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.connect(gn); gn.connect(ctx.destination);
        o.type = oscType; o.frequency.value = freq;
        gn.gain.setValueAtTime(vol, ctx.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
        o.start(); o.stop(ctx.currentTime + dur);
      };

      switch (type) {
        case 'fire': makeOsc(800, 'sine', 0.08, 0.15, 200); break;
        case 'airstrike': makeOsc(300, 'sawtooth', 0.1, 0.5, 100); break;
        case 'jammer': makeOsc(1200, 'square', 0.06, 0.3, 400); break;
        case 'beam': makeOsc(2000, 'sine', 0.05, 0.2); break;
        case 'powerup-green':
          [523, 659, 784, 1047].forEach((f, i) => {
            const o = ctx.createOscillator(); const gn = ctx.createGain();
            o.connect(gn); gn.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = f;
            gn.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.06);
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.2);
            o.start(ctx.currentTime + i * 0.06); o.stop(ctx.currentTime + i * 0.06 + 0.2);
          }); break;
        case 'powerup-blue':
          [330, 440, 554, 659, 880].forEach((f, i) => {
            const o = ctx.createOscillator(); const gn = ctx.createGain();
            o.connect(gn); gn.connect(ctx.destination);
            o.type = 'triangle'; o.frequency.value = f;
            gn.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.05);
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.35);
            o.start(ctx.currentTime + i * 0.05); o.stop(ctx.currentTime + i * 0.05 + 0.35);
          }); break;
        case 'powerup-yellow': {
          const o = ctx.createOscillator(); const gn = ctx.createGain();
          o.connect(gn); gn.connect(ctx.destination); o.type = 'sawtooth';
          o.frequency.setValueAtTime(600, ctx.currentTime);
          o.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
          o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
          o.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.45);
          gn.gain.setValueAtTime(0.1, ctx.currentTime);
          gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          o.start(); o.stop(ctx.currentTime + 0.5); break;
        }
        case 'powerup-purple':
          [880, 1100, 1320, 880].forEach((f, i) => {
            const o = ctx.createOscillator(); const gn = ctx.createGain();
            o.connect(gn); gn.connect(ctx.destination);
            o.type = 'sine'; o.frequency.value = f; o.detune.value = Math.sin(i) * 30;
            gn.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
            o.start(ctx.currentTime + i * 0.08); o.stop(ctx.currentTime + i * 0.08 + 0.3);
          }); break;
        case 'powerup-white': {
          const bufLen = ctx.sampleRate * 0.4;
          const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
          const src = ctx.createBufferSource(); src.buffer = buf;
          const flt = ctx.createBiquadFilter(); flt.type = 'bandpass';
          flt.frequency.setValueAtTime(2000, ctx.currentTime);
          flt.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4); flt.Q.value = 2;
          const gn = ctx.createGain();
          gn.gain.setValueAtTime(0.15, ctx.currentTime);
          gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          src.connect(flt).connect(gn).connect(ctx.destination);
          src.start(); src.stop(ctx.currentTime + 0.4); break;
        }
        case 'shield-block': makeOsc(1500, 'square', 0.12, 0.15, 300); break;
        case 'powerup-pink':
          [440, 660, 880, 1100, 880].forEach((f, i) => {
            const o = ctx.createOscillator(); const gn = ctx.createGain();
            o.connect(gn); gn.connect(ctx.destination);
            o.type = 'sawtooth'; o.frequency.value = f;
            gn.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.25);
            o.start(ctx.currentTime + i * 0.07); o.stop(ctx.currentTime + i * 0.07 + 0.25);
          }); break;
      }
    } catch {}
  };
  const playSound = (type: string) => playSoundRef.current(type);

  const startGame = (mode: 'campaign' | 'survival') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScoreSaved(false);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = createInitialState(w, h);
    s.mode = mode;
    stateRef.current = startWave(s, w, h);
    setPhase(stateRef.current.phase);
    setGameState({ ...stateRef.current });
    if (musicEnabled) musicRef.current.start(1);
  };

  const handleNextWave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    stateRef.current = nextWave(stateRef.current, w, h);
    setPhase(stateRef.current.phase);
    setGameState({ ...stateRef.current });
    if (musicEnabled) musicRef.current.setIntensity(stateRef.current.wave);
  };

  const handleBuyItem = (itemId: string) => {
    if (!stateRef.current) return;
    stateRef.current = buyStoreItem(stateRef.current, itemId);
    setGameState({ ...stateRef.current });
  };

  const handleRestart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    musicRef.current.stop();
    const w = window.innerWidth;
    const h = window.innerHeight;
    stateRef.current = createInitialState(w, h);
    setPhase('menu');
    setGameState(stateRef.current);
  };

  const handleResume = () => {
    if (!stateRef.current) return;
    stateRef.current.phase = 'playing';
    setPhase('playing');
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        onPointerDown={handleCanvasClick}
        onTouchMove={(e) => e.preventDefault()}
      />

      {/* Top-left back button - always visible */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white z-30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs font-semibold">{T('backToMenu')}</span>
      </button>

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
                  <MenuButtonSmall icon="🏆" label={T('leaderboard')} onClick={() => {
                    fetchLeaderboard('campaign');
                    setLeaderboardMode('campaign');
                    if (stateRef.current) {
                      stateRef.current.phase = 'leaderboard';
                      setPhase('leaderboard');
                    }
                  }} />
                </div>
              </div>

              {/* Auth status / Login button */}
              <div className="mt-4 px-4 py-3 bg-black/40 rounded-xl border border-cyan-900/30 text-center w-full">
                {user ? (
                  <p className="text-green-400/70 text-xs">✅ מחובר — הניקוד ישמר בלידרבורד</p>
                ) : (
                  <button
                    onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                    className="flex items-center justify-center gap-2 w-full text-cyan-300/70 hover:text-cyan-200 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="text-xs font-bold">התחבר כדי לשמור ניקוד בלידרבורד</span>
                  </button>
                )}
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
              {/* Wave Perks Display */}
              {gameState.wavePerksDisplay && gameState.wavePerksDisplay.length > 0 && (
                <motion.div
                  className="mt-4 flex flex-col items-center gap-1"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-yellow-400/80 text-xs font-bold tracking-widest mb-1">⚡ כוחות גל ⚡</p>
                  {gameState.wavePerksDisplay.map((perk, i) => (
                    <motion.p
                      key={i}
                      className="text-yellow-300/90 text-sm font-bold"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      {perk}
                    </motion.p>
                  ))}
                </motion.div>
              )}
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

              <div className="flex flex-col gap-2 mb-4 max-h-[40vh] overflow-y-auto">
                {gameState.storeItems.map(item => {
                  const isSoldOut = item.bought >= item.maxBuys;
                  const cantAfford = gameState.credits < item.cost;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleBuyItem(item.id)}
                      disabled={isSoldOut || cantAfford}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        isSoldOut
                          ? 'bg-green-900/20 border-green-900/30 opacity-60'
                          : cantAfford
                          ? 'bg-black/40 border-cyan-900/20 opacity-40 cursor-not-allowed'
                          : 'bg-black/40 border-cyan-900/20 hover:border-cyan-600/40 hover:bg-cyan-900/20'
                      }`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-bold">{item.name}</p>
                        <p className="text-cyan-300/50 text-xs">{item.description}</p>
                      </div>
                      <div className="text-right">
                        {isSoldOut ? (
                          <p className="text-green-400 text-xs font-bold">✅ נקנה</p>
                        ) : (
                          <p className="text-green-400 text-sm font-bold">{item.cost} 💰</p>
                        )}
                        <p className="text-cyan-300/30 text-xs">{item.bought}/{item.maxBuys}</p>
                      </div>
                    </button>
                  );
                })}
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

              {/* Score save status */}
              <div className="text-center text-xs mb-3">
                {scoreSaved ? (
                  <span className="text-green-400">✅ {T('scoreSaved')}</span>
                ) : !user ? (
                  <button onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                    className="text-cyan-300/70 hover:text-cyan-200 transition-colors flex items-center justify-center gap-1 w-full">
                    <LogIn className="w-3 h-3" />
                    <span>🔒 התחבר כדי לשמור ניקוד</span>
                  </button>
                ) : null}
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

              {/* Score save status */}
              <div className="text-center text-xs mb-3">
                {scoreSaved ? (
                  <span className="text-green-400">✅ {T('scoreSaved')}</span>
                ) : !user ? (
                  <button onClick={() => { setShowAuthModal(true); setAuthMode('login'); }}
                    className="text-cyan-300/70 hover:text-cyan-200 transition-colors flex items-center justify-center gap-1 w-full">
                    <LogIn className="w-3 h-3" />
                    <span>🔒 התחבר כדי לשמור ניקוד</span>
                  </button>
                ) : null}
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

      {/* Leaderboard */}
      <AnimatePresence>
        {phase === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 overflow-y-auto py-8"
          >
            <div className="bg-[#0a1525] border border-cyan-900/40 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-yellow-400 text-center mb-1" style={{ fontFamily: "'Courier New', monospace" }}>
                🏆 {T('leaderboard')}
              </h2>

              {/* Mode tabs */}
              <div className="flex gap-2 mb-4 mt-3">
                {(['campaign', 'survival'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setLeaderboardMode(mode); fetchLeaderboard(mode); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                      leaderboardMode === mode
                        ? 'bg-cyan-600/80 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {mode === 'campaign' ? T('campaign') : T('survival')}
                  </button>
                ))}
              </div>

              <p className="text-cyan-300/40 text-xs text-center mb-3">
                {leaderboardMode === 'campaign' ? T('campaignTop') : T('survivalTop')}
              </p>

              {loadingLB ? (
                <div className="text-center py-8">
                  <motion.div
                    className="text-3xl mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ⏳
                  </motion.div>
                </div>
              ) : leaderboardData.length === 0 ? (
                <p className="text-cyan-300/50 text-sm text-center py-8">{T('noScores')}</p>
              ) : (
                <div className="space-y-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-1 text-[10px] text-cyan-300/40 font-bold uppercase tracking-wider">
                    <span className="w-8">{T('rank')}</span>
                    <span className="flex-1">{T('player')}</span>
                    <span className="w-16 text-right">{T('score')}</span>
                    <span className="w-12 text-right">{T('wave')}</span>
                    <span className="w-12 text-right">{T('maxCombo')}</span>
                  </div>
                  {leaderboardData.map((entry, i) => {
                    const isMe = user && entry.user_id === user.id;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                          isMe
                            ? 'bg-cyan-600/20 border border-cyan-500/30'
                            : i % 2 === 0
                            ? 'bg-black/20'
                            : 'bg-black/40'
                        }`}
                      >
                        <span className="w-8 text-center font-bold text-cyan-300/60">
                          {i < 3 ? medals[i] : i + 1}
                        </span>
                        <span className={`flex-1 font-semibold truncate ${isMe ? 'text-cyan-300' : 'text-white/80'}`}>
                          {entry.display_name}
                        </span>
                        <span className="w-16 text-right font-bold text-yellow-400">{entry.score}</span>
                        <span className="w-12 text-right text-cyan-300/60">{entry.wave}</span>
                        <span className="w-12 text-right text-orange-400/60">x{entry.max_combo}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => {
                  if (stateRef.current) {
                    stateRef.current.phase = 'menu';
                    setPhase('menu');
                  }
                }}
                className="w-full py-3 bg-cyan-600/60 text-white rounded-xl font-bold mt-4 hover:bg-cyan-500/60 transition-colors"
              >
                {T('close')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Big Power-up Timers on right side */}
      {phase === 'playing' && gameState && (
        <div className="absolute top-16 right-3 z-20 flex flex-col gap-2 pointer-events-none">
          <PowerUpTimer emoji="🟢" label="x3" timer={gameState.tripleInterceptorTimer} maxTimer={10000} color="#44FF44" glowColor="rgba(68,255,68,0.4)" />
          <PowerUpTimer emoji="🔵" label="AUTO" timer={gameState.autoFireTimer} maxTimer={5000} color="#4488FF" glowColor="rgba(68,136,255,0.4)" />
          <PowerUpTimer emoji="🟡" label="DOME" timer={gameState.autoDefenseTimer} maxTimer={10000} color="#FFFF44" glowColor="rgba(255,255,68,0.4)" />
          <PowerUpTimer emoji="🟣" label="SHIELD" timer={gameState.shieldTimer} maxTimer={10000} color="#CC88FF" glowColor="rgba(180,100,255,0.4)" />
          <PowerUpTimer emoji="⚪" label="EMP" timer={gameState.empTimer} maxTimer={10000} color="#FFFFFF" glowColor="rgba(255,255,255,0.3)" />
          <PowerUpTimer emoji="🚁" label="HELI" timer={gameState.helicopterTimer} maxTimer={10000} color="#FF88AA" glowColor="rgba(255,136,170,0.4)" />
        </div>
      )}

      {/* Bottom info bar during gameplay */}
      {phase === 'playing' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-white/30 text-[10px] font-mono pointer-events-none">
          🚀 {T('missile')} · ✈ {T('uav')} · 💣 {T('cluster')} (7s!) · ☢ {T('heavy')} (2 hits!) · ESC = {T('paused')}
        </div>
      )}

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 bg-black/80"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false); }}
          >
            <motion.div
              className="bg-[#0a1525] border border-cyan-900/40 rounded-2xl p-6 max-w-sm w-full mx-4"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-cyan-400 text-center mb-4" style={{ fontFamily: "'Courier New', monospace" }}>
                {authMode === 'login' ? '🔑 התחברות' : '📝 הרשמה'}
              </h2>

              <div className="flex flex-col gap-3">
                {authMode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                    <input
                      type="text"
                      placeholder="שם תצוגה"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                  <input
                    type="email"
                    placeholder="אימייל"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    dir="ltr"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    placeholder="סיסמה"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    dir="ltr"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(); }}
                  />
                  <button onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-300">
                    {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleAuth}
                  disabled={authLoading || !authEmail || !authPassword}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-40"
                >
                  {authLoading ? '⏳...' : authMode === 'login' ? 'התחבר' : 'הירשם'}
                </button>

                <p className="text-center text-xs text-cyan-300/50">
                  {authMode === 'login' ? 'אין לך חשבון? ' : 'יש לך חשבון? '}
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold"
                  >
                    {authMode === 'login' ? 'הירשם' : 'התחבר'}
                  </button>
                </p>

                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

const PowerUpTimer: React.FC<{
  emoji: string;
  label: string;
  timer: number;
  maxTimer: number;
  color: string;
  glowColor: string;
}> = ({ emoji, label, timer, maxTimer, color, glowColor }) => {
  if (timer <= 0) return null;
  const seconds = Math.ceil(timer / 1000);
  const progress = timer / maxTimer;
  
  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      className="relative flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm"
      style={{
        background: `linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))`,
        borderColor: color + '40',
        boxShadow: `0 0 20px ${glowColor}`,
        minWidth: 100,
      }}
    >
      <span className="text-lg">{emoji}</span>
      <div className="flex flex-col items-start flex-1">
        <span className="text-[10px] font-bold tracking-wider" style={{ color: color + 'AA' }}>{label}</span>
        <motion.span
          className="text-2xl font-black tabular-nums leading-none"
          style={{ color, textShadow: `0 0 15px ${glowColor}` }}
          key={seconds}
          initial={{ scale: 1.4, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {seconds}
        </motion.span>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-1 left-2 right-2 h-[3px] rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ background: color, width: `${progress * 100}%` }}
        />
      </div>
    </motion.div>
  );
};

export default IronDomeGame;
