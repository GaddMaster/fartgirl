"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  swirlSeed: number;
}

const GAS_COLORS = [
  "0, 255, 60",    // bright green
  "80, 255, 80",   // light green
  "0, 200, 40",    // medium green
  "180, 255, 0",   // yellow-green
  "255, 230, 0",   // yellow
  "255, 180, 0",   // orange
  "120, 255, 50",  // lime
];

export default function GreenGasCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  const createParticle = useCallback(
    (x: number, y: number, fromMouse = false): Particle => {
      const color = GAS_COLORS[Math.floor(Math.random() * GAS_COLORS.length)];
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = fromMouse ? Math.random() * 0.9 + 0.35 : Math.random() * 0.45 + 0.12;
      const maxLife = fromMouse ? 120 + Math.random() * 110 : 150 + Math.random() * 160;
      return {
        x,
        y,
        vx: Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed - (fromMouse ? 0.35 : 0.2),
        radius: fromMouse ? Math.random() * 14 + 5 : Math.random() * 10 + 3,
        opacity: fromMouse ? 0.14 + Math.random() * 0.12 : 0.06 + Math.random() * 0.06,
        color,
        life: 0,
        maxLife,
        swirlSeed: Math.random() * 1000,
      };
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.offsetWidth * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Ambient particles
    const spawnAmbient = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < 45; i++) {
        particlesRef.current.push(
          createParticle(Math.random() * w, Math.random() * h, false)
        );
      }
    };
    spawnAmbient();

    const spawnAtPointer = (x: number, y: number, amount: number) => {
      for (let i = 0; i < amount; i++) {
        particlesRef.current.push(
          createParticle(
            x + (Math.random() - 0.5) * 26,
            y + (Math.random() - 0.5) * 26,
            true
          )
        );
      }
    };

    const updatePointer = (clientX: number, clientY: number, active: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const inBounds = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;

      if (inBounds) {
        pointerRef.current.x = x;
        pointerRef.current.y = y;
        pointerRef.current.active = active;
        if (active) {
          spawnAtPointer(x, y, 4);
        }
      } else {
        pointerRef.current.active = false;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY, true);
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY, pointerRef.current.active || e.pressure > 0);
    };

    const onPointerUp = () => {
      pointerRef.current.active = false;
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
    };

    const onWindowBlur = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });
    canvas.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("blur", onWindowBlur);

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      frameRef.current += 1;
      const time = frameRef.current * 0.016;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // Keep spawning ambient particles
      if (frameRef.current % 3 === 0) {
        particlesRef.current.push(
          createParticle(Math.random() * w, h + 20, false)
        );
      }
      if (frameRef.current % 9 === 0) {
        particlesRef.current.push(
          createParticle(Math.random() * w, h * 0.6 + Math.random() * (h * 0.5), false)
        );
      }

      if (pointerRef.current.active && frameRef.current % 2 === 0) {
        spawnAtPointer(pointerRef.current.x, pointerRef.current.y, 2);
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const swirl = Math.sin(time * 1.4 + p.swirlSeed + p.y * 0.02) * 0.05;
        const shear = Math.sin((p.x + p.swirlSeed) * 0.01 + time * 0.8) * 0.03;

        p.life++;
        p.vx += swirl + shear;
        p.vy -= 0.003 + (1 - lifeRatio) * 0.0015;
        p.x += p.vx;
        p.y += p.vy;

        // Pointer interaction for desktop + touch drag/hold
        if (pointerRef.current.active) {
          const dx = p.x - pointerRef.current.x;
          const dy = p.y - pointerRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160 && dist > 0) {
            const force = (160 - dist) / 160;
            p.vx += (dx / dist) * force * 0.18;
            p.vy += (dy / dist) * force * 0.15;
          }
        }

        // Damping
        p.vx *= 0.988;
        p.vy *= 0.991;

        const fadeIn = Math.min(lifeRatio * 3.5, 1);
        const fadeOut = lifeRatio > 0.55 ? 1 - (lifeRatio - 0.55) / 0.45 : 1;
        const alpha = p.opacity * fadeIn * fadeOut;

        if (alpha <= 0 || p.life > p.maxLife || p.y < -50 || p.x < -120 || p.x > w + 120) {
          particles.splice(i, 1);
          continue;
        }

        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius
        );
        gradient.addColorStop(0, `rgba(${p.color}, ${alpha})`);
        gradient.addColorStop(0.35, `rgba(${p.color}, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cap particles
      if (particles.length > 650) {
        particles.splice(0, particles.length - 650);
      }

      ctx.globalCompositeOperation = "source-over";

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("blur", onWindowBlur);
      cancelAnimationFrame(animRef.current);
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0"
      style={{ touchAction: "none" }}
    />
  );
}
