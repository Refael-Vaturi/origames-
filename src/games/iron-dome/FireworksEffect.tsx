import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
}

const COLORS = ['#FFD700', '#FFA500', '#FF6347', '#FFFF00', '#FF69B4', '#00FFFF', '#7CFC00'];

const FireworksEffect: React.FC<{ active: boolean; duration?: number }> = ({ active, duration = 3000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const lw = canvas.offsetWidth;
    const lh = canvas.offsetHeight;

    particlesRef.current = [];
    startRef.current = performance.now();

    const burst = (cx: number, cy: number) => {
      const count = 40 + Math.random() * 30;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1, maxLife: 60 + Math.random() * 40,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 2 + Math.random() * 3,
        });
      }
    };

    // Initial bursts
    burst(lw * 0.3, lh * 0.3);
    burst(lw * 0.7, lh * 0.4);
    burst(lw * 0.5, lh * 0.2);

    let burstTimer = 0;

    const loop = () => {
      const elapsed = performance.now() - startRef.current;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, lw, lh);
        return;
      }

      ctx.clearRect(0, 0, lw, lh);

      burstTimer++;
      if (burstTimer % 30 === 0 && elapsed < duration * 0.7) {
        burst(Math.random() * lw, Math.random() * lh * 0.6);
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        if (p.life > p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.vx *= 0.99;
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Golden sparkle text
      if (elapsed < duration * 0.8) {
        const pulse = 0.8 + Math.sin(elapsed / 200) * 0.2;
        ctx.save();
        ctx.font = `bold ${28 * pulse}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 215, 0, ${0.9 * (1 - elapsed / duration)})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('★★★', lw / 2, lh / 2);
        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-50 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default FireworksEffect;
