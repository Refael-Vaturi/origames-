import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Infinity as InfinityIcon, BookOpen, Trophy, Volume2, VolumeX, Music, Pause, LogIn, Mail, Lock, Eye, EyeOff, User, AtSign, Settings, X, ShoppingCart, CreditCard } from 'lucide-react';
import {
  createInitialState, startWave, startSurvival, fireInterceptor, update, nextWave,
  buyStoreItem, activateAirSupport, activateGPSJammer, activateHeliAirstrike, renderGame,
} from './engine';
import { GameState, GamePhase } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t as ironT } from './i18n';
import LanguageSelector from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
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
  const [showInGameSettings, setShowInGameSettings] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<'campaign' | 'survival'>('campaign');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [loadingLB, setLoadingLB] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'username' | 'email'>('username');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [persistentCredits, setPersistentCredits] = useState(0);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerSkill, setPlayerSkill] = useState(1.0);

  const T = useCallback((key: string) => ironT(key, language), [language]);
  const { t: appT } = useLanguage();

  const formatSurvivalTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const usernameToEmail = (u: string) => `${u.toLowerCase().replace(/[^a-z0-9_]/g, '')}@fakeitfast.local`;

  const handleAuth = async () => {
    if (authMethod === 'username') {
      if (!authUsername || !authPassword) return;
      if (authUsername.length < 3) {
        toast({ title: appT('auth.usernameTooShort'), variant: 'destructive' });
        return;
      }
    } else {
      if (!authEmail || !authPassword) return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const signUpEmail = authMethod === 'username' ? usernameToEmail(authUsername) : authEmail;
        const signUpDisplayName = authMethod === 'username' ? (authDisplayName || authUsername) : (authDisplayName || 'Player');
        const { error } = await supabase.auth.signUp({
          email: signUpEmail,
          password: authPassword,
          options: {
            data: { display_name: signUpDisplayName, username: authMethod === 'username' ? authUsername : undefined },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (authMethod === 'username') {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from('profiles').update({ username: authUsername, display_name: signUpDisplayName }).eq('user_id', newUser.id);
          }
          toast({ title: appT('auth.loginBtn') + ' ✅' });
          setShowAuthModal(false);
        } else {
          toast({ title: appT('auth.checkEmail') });
          setShowAuthModal(false);
        }
      } else {
        const loginEmail = authMethod === 'username' ? usernameToEmail(authUsername) : authEmail;
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: authPassword });
        if (error) throw error;
        toast({ title: appT('auth.loginBtn') + ' ✅' });
        setShowAuthModal(false);
      }
    } catch (e: any) {
      toast({ title: e.message || appT('auth.error'), variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/iron-dome',
      });
      if (result.error) toast({ title: String(result.error), variant: 'destructive' });
    } catch (e: any) {
      toast({ title: e.message || appT('auth.error'), variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin + '/iron-dome',
      });
      if (result.error) toast({ title: String(result.error), variant: 'destructive' });
    } catch (e: any) {
      toast({ title: e.message || appT('auth.error'), variant: 'destructive' });
    } finally {
      setAuthLoading(false);
    }
  };



  // Detect user country from timezone
  const getCountryFromTimezone = (): string => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tzToCountry: Record<string, string> = {
        'Asia/Jerusalem': '🇮🇱', 'Asia/Tel_Aviv': '🇮🇱',
        'America/New_York': '🇺🇸', 'America/Chicago': '🇺🇸', 'America/Denver': '🇺🇸', 'America/Los_Angeles': '🇺🇸',
        'America/Toronto': '🇨🇦', 'America/Vancouver': '🇨🇦',
        'Europe/London': '🇬🇧', 'Europe/Paris': '🇫🇷', 'Europe/Berlin': '🇩🇪',
        'Europe/Madrid': '🇪🇸', 'Europe/Rome': '🇮🇹', 'Europe/Amsterdam': '🇳🇱',
        'Europe/Stockholm': '🇸🇪', 'Europe/Warsaw': '🇵🇱', 'Europe/Kiev': '🇺🇦', 'Europe/Kyiv': '🇺🇦',
        'Europe/Moscow': '🇷🇺', 'Europe/Istanbul': '🇹🇷',
        'Asia/Tokyo': '🇯🇵', 'Asia/Seoul': '🇰🇷', 'Asia/Shanghai': '🇨🇳', 'Asia/Hong_Kong': '🇭🇰',
        'Asia/Kolkata': '🇮🇳', 'Asia/Calcutta': '🇮🇳',
        'Asia/Dubai': '🇦🇪', 'Asia/Riyadh': '🇸🇦',
        'Asia/Bangkok': '🇹🇭', 'Asia/Ho_Chi_Minh': '🇻🇳',
        'America/Sao_Paulo': '🇧🇷', 'America/Argentina/Buenos_Aires': '🇦🇷',
        'Australia/Sydney': '🇦🇺', 'Pacific/Auckland': '🇳🇿',
        'Africa/Cairo': '🇪🇬', 'Africa/Johannesburg': '🇿🇦',
      };
      return tzToCountry[tz] || '🌍';
    } catch { return '🌍'; }
  };

  const saveScore = useCallback(async (state: GameState) => {
    if (!user || scoreSaved) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const country = getCountryFromTimezone();

      await supabase.from('iron_dome_scores').insert({
        user_id: user.id,
        display_name: profile?.display_name || 'Player',
        score: state.score,
        wave: state.wave,
        max_combo: state.maxCombo,
        mode: state.mode,
        country,
        survival_time: state.mode === 'survival' ? Math.floor(state.survivalTimer / 1000) : 0,
      } as any);
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
      .limit(100);
    // Keep only the best score per player
    const bestByPlayer = new Map<string, any>();
    (data || []).forEach(row => {
      if (!bestByPlayer.has(row.user_id) || row.score > bestByPlayer.get(row.user_id).score) {
        bestByPlayer.set(row.user_id, row);
      }
    });
    setLeaderboardData(Array.from(bestByPlayer.values()).slice(0, 15));
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

  // Auto-save score on game over or victory + save skill
  useEffect(() => {
    if ((phase === 'game-over' || phase === 'victory') && gameState && user && !scoreSaved) {
      saveScore(gameState);
      // Save skill data for adaptive difficulty
      const accuracy = gameState.totalFired > 0 ? gameState.totalIntercepted / gameState.totalFired : 0.5;
      const updateSkill = async () => {
        try {
          const { data: existing } = await supabase.from('player_skill').select('*').eq('user_id', user.id).single();
          if (existing) {
            const gp = existing.games_played + 1;
            const newAccuracy = (existing.accuracy * existing.games_played + accuracy) / gp;
            const newWave = (existing.avg_wave_reached * existing.games_played + gameState.wave) / gp;
            const newSurv = gameState.mode === 'survival'
              ? (existing.avg_survival_time * existing.games_played + gameState.survivalTimer / 1000) / gp
              : existing.avg_survival_time;
            const rating = Math.max(0.3, Math.min(3.0, (newAccuracy * 2 + newWave / 5 + newSurv / 60) / 3));
            await supabase.from('player_skill').update({
              accuracy: newAccuracy, avg_wave_reached: newWave, avg_survival_time: newSurv,
              games_played: gp, skill_rating: rating, updated_at: new Date().toISOString(),
            }).eq('user_id', user.id);
            setPlayerSkill(rating);
          } else {
            const rating = Math.max(0.3, Math.min(3.0, accuracy * 2));
            await supabase.from('player_skill').insert({
              user_id: user.id, accuracy, avg_wave_reached: gameState.wave,
              avg_survival_time: gameState.mode === 'survival' ? gameState.survivalTimer / 1000 : 0,
              games_played: 1, skill_rating: rating,
            });
            setPlayerSkill(rating);
          }
        } catch (e) { console.error('Failed to save skill:', e); }
      };
      updateSkill();
    }
  }, [phase, gameState, user, scoreSaved, saveScore]);

  // Fetch persistent credits and player skill
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: credits }, { data: skill }] = await Promise.all([
        supabase.from('player_credits').select('credits').eq('user_id', user.id).single(),
        supabase.from('player_skill').select('skill_rating').eq('user_id', user.id).single(),
      ]);
      if (credits) setPersistentCredits(credits.credits);
      if (skill) setPlayerSkill(skill.skill_rating);
    };
    fetchData();
  }, [user]);

  // Handle purchase return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success' && user) {
      const credits = parseInt(params.get('credits') || '0');
      if (credits > 0) {
        supabase.functions.invoke('confirm-credits', { body: { credits } }).then(() => {
          setPersistentCredits(prev => prev + credits);
          toast({ title: `✅ נוספו ${credits} קרדיטים!` });
        });
        window.history.replaceState({}, '', '/iron-dome');
      }
    }
  }, [user]);

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
        renderGame(ctx, stateRef.current, logicalW, logicalH, time, languageRef.current);
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
    stateRef.current = startWave(s, w, h, playerSkill);
    setPhase(stateRef.current.phase);
    setGameState({ ...stateRef.current });
    if (musicEnabled) musicRef.current.start(1);
  };

  const handleNextWave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    stateRef.current = nextWave(stateRef.current, w, h, playerSkill);
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

      {/* Top-left back button - hidden during active gameplay */}
      {phase !== 'playing' && phase !== 'paused' && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white z-30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-semibold">{T('backToMenu')}</span>
        </button>
      )}

      {/* Single settings button with rotation animation */}
      <div className={`absolute z-30 ${phase === 'playing' ? 'bottom-14 right-3' : 'top-3 right-3'}`}>
        <motion.button
          onClick={() => setShowInGameSettings(!showInGameSettings)}
          className="p-2 bg-black/40 rounded-lg backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-colors"
          animate={{ rotate: showInGameSettings ? 90 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Settings dropdown */}
      <AnimatePresence>
        {showInGameSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={`absolute z-40 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-3 flex flex-col gap-2 min-w-[180px] ${
              phase === 'playing' ? 'bottom-24 right-3' : 'top-14 right-3'
            }`}
          >
            {(phase === 'playing' || phase === 'paused') && (
              <>
                <button
                  onClick={() => {
                    if (phase === 'playing' && stateRef.current) {
                      stateRef.current.phase = 'paused';
                      setPhase('paused');
                    } else if (phase === 'paused') {
                      handleResume();
                    }
                    setShowInGameSettings(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 text-sm"
                >
                  <Pause className="w-4 h-4" />
                  <span>{phase === 'paused' ? `▶ ${T('resume')}` : `⏸ ${T('paused')}`}</span>
                </button>
                <div className="h-px bg-white/10" />
              </>
            )}
            <button onClick={() => setMusicEnabled(!musicEnabled)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 text-sm">
              <Music className="w-4 h-4" style={{ opacity: musicEnabled ? 1 : 0.3 }} />
              <span>{musicEnabled ? '🎵 Music ON' : '🔇 Music OFF'}</span>
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 text-sm">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}</span>
            </button>
            <div className="h-px bg-white/10" />
            <div className="[&_button]:bg-transparent [&_button]:shadow-none [&_button]:border-0 [&_button]:text-white/80 [&_button]:text-sm [&_button]:p-0 [&_button]:rounded-lg">
              <LanguageSelector />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <MenuButton icon={<Play className="w-5 h-5" />} label={T('campaign')} sub={T('play-∞-waves')} onClick={() => startGame('campaign')} color="cyan" />
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
                  <MenuButtonSmall icon="🛒" label={T('store')} onClick={() => {
                    if (stateRef.current) {
                      stateRef.current.phase = 'main-shop' as any;
                      setPhase('main-shop');
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
                  ? `∞ ${T('wave')}`
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
                    {leaderboardMode === 'survival' ? (
                      <span className="w-14 text-right">⏱ {T('time') || 'Time'}</span>
                    ) : (
                      <span className="w-12 text-right">{T('wave')}</span>
                    )}
                    <span className="w-12 text-right">{T('maxCombo')}</span>
                  </div>
                  {leaderboardData.map((entry, i) => {
                    const isMe = user && entry.user_id === user.id;
                    const medals = ['🥇', '🥈', '🥉'];
                    const survSecs = entry.survival_time || 0;
                    const survMin = Math.floor(survSecs / 60);
                    const survSecRem = survSecs % 60;
                    const survDisplay = `${survMin}:${survSecRem.toString().padStart(2, '0')}`;
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
                          {entry.display_name} {entry.country || ''}
                        </span>
                        <span className="w-16 text-right font-bold text-yellow-400">{entry.score}</span>
                        {leaderboardMode === 'survival' ? (
                          <span className="w-14 text-right text-green-400/80">{survDisplay}</span>
                        ) : (
                          <span className="w-12 text-right text-cyan-300/60">{entry.wave}</span>
                        )}
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


      {/* Main Shop (from menu) */}
      <AnimatePresence>
        {phase === 'main-shop' && (
          <motion.div
            key="main-shop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 overflow-y-auto py-8"
          >
            <div className="bg-[#0a1525] border border-cyan-900/40 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-cyan-400 text-center mb-1" style={{ fontFamily: "'Courier New', monospace" }}>
                🛒 {T('store')}
              </h2>
              <p className="text-cyan-300/40 text-xs text-center mb-2">קנה שדרוגים עם קרדיטים של המשחק</p>
              <p className="text-green-400 text-center text-sm mb-4">💰 הקרדיטים שלך: {persistentCredits}</p>

              {/* In-game items */}
              <div className="flex flex-col gap-2 mb-6">
                {[
                  { id: 'buy-first-aid', name: '🩹 חיים נוספים', desc: '+1 חיים בתחילת המשחק', cost: 20 },
                  { id: 'buy-extra-ammo', name: '🎯 תחמושת נוספת', desc: '+5 תחמושת מקסימלית', cost: 30 },
                  { id: 'buy-fast-reload', name: '⚡ טעינה מהירה', desc: 'טעינה מהירה קבועה', cost: 80 },
                  { id: 'buy-shield', name: '🟣 מגן התחלתי', desc: 'מגן 10 שניות בתחילת כל משחק', cost: 50 },
                  { id: 'buy-triple-dome', name: '🟢 3 כיפות ברזל', desc: '3 כיפות 15 שניות בתחילת כל משחק', cost: 100 },
                ].map(item => {
                  const cantAfford = persistentCredits < item.cost;
                  return (
                    <button
                      key={item.id}
                      onClick={async () => {
                        if (cantAfford || !user) return;
                        // Deduct credits locally and in DB
                        setPersistentCredits(prev => prev - item.cost);
                        try {
                          const { data: existing } = await supabase.from('player_credits').select('credits').eq('user_id', user.id).single();
                          if (existing) {
                            await supabase.from('player_credits').update({ credits: existing.credits - item.cost, updated_at: new Date().toISOString() }).eq('user_id', user.id);
                          }
                          toast({ title: `✅ ${item.name} נקנה!` });
                        } catch { toast({ title: 'שגיאה ברכישה', variant: 'destructive' }); }
                      }}
                      disabled={cantAfford || !user}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        cantAfford || !user
                          ? 'bg-black/40 border-cyan-900/20 opacity-40 cursor-not-allowed'
                          : 'bg-black/40 border-cyan-900/20 hover:border-cyan-600/40 hover:bg-cyan-900/20'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-white text-sm font-bold">{item.name}</p>
                        <p className="text-cyan-300/50 text-xs">{item.desc}</p>
                      </div>
                      <p className="text-green-400 text-sm font-bold">{item.cost} 💰</p>
                    </button>
                  );
                })}
              </div>

              {/* Buy credits with real money */}
              <div className="border-t border-cyan-900/30 pt-4 mb-4">
                <h3 className="text-lg font-bold text-yellow-400 text-center mb-3" style={{ fontFamily: "'Courier New', monospace" }}>
                  💳 קנה קרדיטים
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { packId: 'pack-100', label: '100 💰', price: '$2.99' },
                    { packId: 'pack-300', label: '300 💰', price: '$4.99', popular: true },
                    { packId: 'pack-1000', label: '1000 💰', price: '$9.99' },
                  ].map(pack => (
                    <motion.button
                      key={pack.packId}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        if (!user) { setShowAuthModal(true); return; }
                        setBuyingCredits(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('buy-credits', {
                            body: { packId: pack.packId },
                          });
                          if (error) throw error;
                          if (data?.url) window.location.href = data.url;
                        } catch (e: any) {
                          toast({ title: e.message || 'שגיאה', variant: 'destructive' });
                        } finally { setBuyingCredits(false); }
                      }}
                      disabled={buyingCredits}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        pack.popular
                          ? 'bg-yellow-900/20 border-yellow-600/40 hover:border-yellow-400/60'
                          : 'bg-black/40 border-cyan-900/20 hover:border-cyan-600/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-bold">{pack.label}</span>
                        {pack.popular && <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">פופולרי</span>}
                      </div>
                      <span className="text-green-400 font-bold">{pack.price}</span>
                    </motion.button>
                  ))}
                </div>
                {!user && <p className="text-center text-xs text-cyan-300/50 mt-2">🔒 התחבר כדי לקנות קרדיטים</p>}
              </div>

              <button
                onClick={() => {
                  if (stateRef.current) {
                    stateRef.current.phase = 'menu';
                    setPhase('menu');
                  }
                }}
                className="w-full py-3 bg-cyan-600/60 text-white rounded-xl font-bold hover:bg-cyan-500/60 transition-colors"
              >
                {T('close')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'playing' && gameState && gameState.mode === 'survival' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.div
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/50 backdrop-blur-sm border border-cyan-500/30"
            animate={{ borderColor: ['rgba(0,200,255,0.3)', 'rgba(0,200,255,0.6)', 'rgba(0,200,255,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-cyan-400 text-sm font-bold">⏱</span>
            <span className="text-cyan-300 text-2xl font-black tabular-nums" style={{ fontFamily: "'Courier New', monospace", textShadow: '0 0 10px rgba(0,200,255,0.5)' }}>
              {formatSurvivalTime(gameState.survivalTimer)}
            </span>
          </motion.div>
        </div>
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
          {gameState.heliAirstrikeTimer > 0 && (
            <PowerUpTimer emoji="🚁" label="STRIKE" timer={gameState.heliAirstrikeTimer} maxTimer={10000} color="#66CCFF" glowColor="rgba(100,200,255,0.4)" />
          )}
        </div>
      )}

      {/* Helicopter Summon Button at bottom center */}
      {phase === 'playing' && gameState && gameState.wave >= 10 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
          <motion.button
            onClick={() => {
              if (stateRef.current && stateRef.current.heliAirstrikeReady) {
                stateRef.current = activateHeliAirstrike(stateRef.current, window.innerWidth);
                setGameState({ ...stateRef.current });
                playSound('airstrike');
              }
            }}
            disabled={!gameState.heliAirstrikeReady}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-sm transition-all ${
              gameState.heliAirstrikeReady
                ? 'bg-cyan-600/40 border-cyan-400/60 text-cyan-200 cursor-pointer hover:bg-cyan-500/50 shadow-[0_0_20px_rgba(0,200,255,0.3)]'
                : 'bg-black/40 border-white/10 text-white/40 cursor-default'
            }`}
            whileTap={gameState.heliAirstrikeReady ? { scale: 0.9 } : {}}
            animate={gameState.heliAirstrikeReady ? { scale: [1, 1.05, 1] } : {}}
            transition={gameState.heliAirstrikeReady ? { duration: 0.8, repeat: Infinity } : {}}
          >
            <span className="text-lg">🚁</span>
            <span className="text-sm font-bold">
              {gameState.heliAirstrikeReady ? T('summonHeli') : `${gameState.coloredMissileHits}/3`}
            </span>
            {!gameState.heliAirstrikeReady && (
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${i < gameState.coloredMissileHits ? 'bg-cyan-400' : 'bg-white/20'}`}
                  />
                ))}
              </div>
            )}
          </motion.button>
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
                {authMode === 'login' ? `🔑 ${appT('auth.login')}` : `📝 ${appT('auth.register')}`}
              </h2>

              {/* OAuth buttons */}
              <div className="flex flex-col gap-2 mb-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl border border-cyan-900/30 bg-black/30 text-white/80 text-sm flex items-center justify-center gap-3 hover:bg-black/50 transition-colors disabled:opacity-40"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {appT('auth.google')}
                </button>
                <button
                  onClick={handleAppleSignIn}
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl border border-cyan-900/30 bg-black/30 text-white/80 text-sm flex items-center justify-center gap-3 hover:bg-black/50 transition-colors disabled:opacity-40"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.12 4.52-3.74 4.25z"/>
                  </svg>
                  {appT('auth.apple')}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-cyan-900/30" />
                <span className="text-xs text-cyan-300/40">{appT('auth.or')}</span>
                <div className="flex-1 h-px bg-cyan-900/30" />
              </div>

              {/* Auth method toggle */}
              <div className="flex bg-black/30 rounded-xl p-1 mb-3">
                <button
                  onClick={() => setAuthMethod('username')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === 'username' ? 'bg-cyan-900/40 text-cyan-300' : 'text-white/40'
                  }`}
                >
                  <User className="w-3 h-3" />
                  {appT('auth.username')}
                </button>
                <button
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === 'email' ? 'bg-cyan-900/40 text-cyan-300' : 'text-white/40'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  Email
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {authMode === 'register' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                    <input
                      type="text"
                      placeholder={appT('auth.displayName')}
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}

                {authMethod === 'username' ? (
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                    <input
                      type="text"
                      placeholder={appT('auth.usernamePlaceholder')}
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value.replace(/\s/g, ''))}
                      className="w-full pl-10 pr-3 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                      dir="ltr"
                      autoComplete="username"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                    <input
                      type="email"
                      placeholder={appT('auth.email')}
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 bg-black/40 border border-cyan-900/30 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
                  <input
                    type={showAuthPassword ? 'text' : 'password'}
                    placeholder={appT('auth.password')}
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
                  disabled={authLoading || (authMethod === 'username' ? !authUsername : !authEmail) || !authPassword}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-40"
                >
                  {authLoading ? '⏳...' : authMode === 'login' ? appT('auth.loginBtn') : appT('auth.registerBtn')}
                </button>

                <p className="text-center text-xs text-cyan-300/50">
                  <button
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold"
                  >
                    {authMode === 'login' ? appT('auth.switchRegister') : appT('auth.switchLogin')}
                  </button>
                </p>

                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  {appT('auth.cancel')}
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
