"use client";

import { useEffect, useRef } from "react";

interface P {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    a: number;
    life: number;
    max: number;
    color: string;
}

const C = ["0,255,60", "80,255,80", "0,200,40", "180,255,0", "255,230,0", "120,255,50"];

export default function GreenGasCanvas() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;

        const pts: P[] = [];
        let w = 1;
        let h = 1;
        let mx = -9999;
        let my = -9999;
        let down = false;
        let raf = 0;
        let lastTime = performance.now();
        let fps = 0;
        let frames = 0;
        let fpsTime = 0;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const r = el!.getBoundingClientRect();
            w = r.width;
            h = r.height;
            el!.width = Math.floor(w * dpr);
            el!.height = Math.floor(h * dpr);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function spawn(x: number, y: number, n: number, burst: boolean) {
            for (let i = 0; i < n; i++) {
                const ang = Math.random() * Math.PI * 2;
                const spd = burst ? 0.5 + Math.random() * 2.2 : 0.08 + Math.random() * 0.35;
                pts.push({
                    x: x + (Math.random() - 0.5) * (burst ? 60 : 24),
                    y: y + (Math.random() - 0.5) * (burst ? 60 : 24),
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - (burst ? 0.6 : 0.15),
                    r: burst ? 4 + Math.random() * 8 : 1.5 + Math.random() * 3.5,
                    a: burst ? 0.32 + Math.random() * 0.28 : 0.08 + Math.random() * 0.12,
                    life: 0,
                    max: 80 + Math.random() * 140,
                    color: C[Math.floor(Math.random() * C.length)],
                });
            }
        }

        resize();

        // Pre-render gradient sprites per color so we never call createRadialGradient in the loop.
        const SPRITE_SIZE = 64;
        const sprites: Record<string, HTMLCanvasElement> = {};
        for (const c of C) {
            const s = document.createElement("canvas");
            s.width = SPRITE_SIZE;
            s.height = SPRITE_SIZE;
            const sc = s.getContext("2d")!;
            const half = SPRITE_SIZE / 2;
            const g = sc.createRadialGradient(half, half, 0, half, half, half);
            g.addColorStop(0, `rgba(${c},1)`);
            g.addColorStop(0.4, `rgba(${c},0.5)`);
            g.addColorStop(1, `rgba(${c},0)`);
            sc.fillStyle = g;
            sc.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
            sprites[c] = s;
        }

        // Seed ambient particles so the hero is never empty.
        for (let i = 0; i < 300; i++) {
            spawn(Math.random() * w, h * 0.35 + Math.random() * h * 0.75, 1, false);
        }

        // Convert page coords to canvas-local coords.
        function toLocal(cx: number, cy: number) {
            const r = el!.getBoundingClientRect();
            return {
                x: cx - r.left,
                y: cy - r.top,
                hit: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom,
            };
        }

        // Use document-level listeners so z-index / pointer-events can never block us.
        function onDown(e: PointerEvent) {
            const p = toLocal(e.clientX, e.clientY);
            if (!p.hit) return;
            down = true;
            mx = p.x;
            my = p.y;
            spawn(p.x, p.y, 80, true);
        }
        function onMove(e: PointerEvent) {
            const p = toLocal(e.clientX, e.clientY);
            if (!p.hit) { mx = -9999; return; }
            mx = p.x;
            my = p.y;
            spawn(p.x, p.y, down ? 18 : 8, down);
        }
        function onUp() {
            down = false;
        }

        document.addEventListener("pointerdown", onDown);
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);

        function loop() {
            ctx!.clearRect(0, 0, w, h);

            // Green fog bed at bottom so the section always glows.
            const fg = ctx!.createRadialGradient(w / 2, h * 1.1, 0, w / 2, h * 1.1, Math.max(w, h) * 0.85);
            fg.addColorStop(0, "rgba(80,255,80,0.22)");
            fg.addColorStop(0.4, "rgba(0,200,40,0.10)");
            fg.addColorStop(1, "rgba(0,0,0,0)");
            ctx!.fillStyle = fg;
            ctx!.fillRect(0, 0, w, h);

            ctx!.globalCompositeOperation = "lighter";

            // Ambient rising particles every frame.
            for (let i = 0; i < 5; i++) {
                spawn(Math.random() * w, h + 10, 1, false);
            }

            // Continuous emit while pointer is inside.
            if (mx > -999 && my > -999) {
                if (down) {
                    spawn(mx, my, 8, true);
                } else {
                    spawn(mx, my, 2, false);
                }
            }

            // Update and draw every particle.
            for (let i = pts.length - 1; i >= 0; i--) {
                const p = pts[i];
                p.life++;
                p.vx += (Math.random() - 0.5) * 0.05;
                p.vy -= 0.008;
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.995;
                p.vy *= 0.997;

                const t = p.life / p.max;
                const fi = Math.min(t * 5, 1);
                const fo = t > 0.5 ? 1 - (t - 0.5) / 0.5 : 1;
                const alpha = p.a * fi * fo;

                if (alpha <= 0 || p.life > p.max || p.y < -60) {
                    pts.splice(i, 1);
                    continue;
                }

                const size = p.r * 5;
                ctx!.globalAlpha = alpha;
                ctx!.drawImage(sprites[p.color], p.x - size / 2, p.y - size / 2, size, size);
                ctx!.globalAlpha = 1;
            }

            if (pts.length > 2000) pts.splice(0, pts.length - 2000);

            ctx!.globalCompositeOperation = "source-over";

            // FPS counter — expose via window for Navbar display.
            frames++;
            const now = performance.now();
            fpsTime += now - lastTime;
            lastTime = now;
            if (fpsTime >= 500) {
                fps = Math.round(frames / (fpsTime / 1000));
                frames = 0;
                fpsTime = 0;
                (window as any).__GAS_FPS__ = fps;
                (window as any).__GAS_PTS__ = pts.length;
            }

            raf = requestAnimationFrame(loop);
        }

        raf = requestAnimationFrame(loop);
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            className="absolute inset-0 w-full h-full z-[1]"
            style={{ touchAction: "none" }}
            aria-hidden="true"
        />
    );
}
