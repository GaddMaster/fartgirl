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
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const animRef = useRef<number>(0);

  const createParticle = useCallback(
    (x: number, y: number, fromMouse = false): Particle => {
      const color = GAS_COLORS[Math.floor(Math.random() * GAS_COLORS.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = fromMouse ? Math.random() * 2 + 0.5 : Math.random() * 0.8 + 0.2;
      const maxLife = fromMouse ? 80 + Math.random() * 60 : 120 + Math.random() * 100;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (fromMouse ? 0.5 : 0.3),
        radius: fromMouse ? Math.random() * 35 + 15 : Math.random() * 50 + 20,
        opacity: fromMouse ? 0.4 + Math.random() * 0.3 : 0.15 + Math.random() * 0.2,
        color,
        life: 0,
        maxLife,
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
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Ambient particles
    const spawnAmbient = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < 30; i++) {
        particlesRef.current.push(
          createParticle(Math.random() * w, Math.random() * h, false)
        );
      }
    };
    spawnAmbient();

    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = clientX - rect.left;
      mouseRef.current.y = clientY - rect.top;
      mouseRef.current.active = true;
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push(
          createParticle(
            mouseRef.current.x + (Math.random() - 0.5) * 40,
            mouseRef.current.y + (Math.random() - 0.5) * 40,
            true
          )
        );
      }
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("mouseleave", onPointerLeave);
    canvas.addEventListener("touchend", onPointerLeave);

    let frameCount = 0;
    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      // Keep spawning ambient particles
      frameCount++;
      if (frameCount % 8 === 0) {
        particlesRef.current.push(
          createParticle(Math.random() * w, h + 20, false)
        );
      }
      if (frameCount % 15 === 0) {
        particlesRef.current.push(
          createParticle(Math.random() * w, Math.random() * h, false)
        );
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Slight wind and turbulence
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy -= 0.01;

        // Mouse repulsion/attraction
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 0) {
            const force = (200 - dist) / 200;
            p.vx += (dx / dist) * force * 0.3;
            p.vy += (dy / dist) * force * 0.3;
          }
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(lifeRatio * 5, 1);
        const fadeOut = lifeRatio > 0.6 ? 1 - (lifeRatio - 0.6) / 0.4 : 1;
        const alpha = p.opacity * fadeIn * fadeOut;

        if (alpha <= 0 || p.life > p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius
        );
        gradient.addColorStop(0, `rgba(${p.color}, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(${p.color}, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${p.color}, 0)`);

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cap particles
      if (particles.length > 300) {
        particles.splice(0, particles.length - 300);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("mouseleave", onPointerLeave);
      canvas.removeEventListener("touchend", onPointerLeave);
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
