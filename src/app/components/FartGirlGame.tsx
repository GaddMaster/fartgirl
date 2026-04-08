"use client";

import { useEffect, useRef } from "react";

// ─── palette ────────────────────────────────────────────────────────
const SKY = "#0a0a1a";
const GROUND = "#1a1a2e";
const PAVEMENT = "#2a2a3e";
const BLDG_COLORS = ["#12121e", "#0f0f1a", "#161628", "#1a1a30", "#111122"];
const WIN_LIT = ["#ffcc66", "#aaddff", "#ffd480", "#66ffaa", "#ff99cc"];
const SKIN = "rgba(220,190,160,0.95)";
const FARTGIRL_GREEN = "#22c55e";

// ─── grid constants ─────────────────────────────────────────────────
const CELL = 16;           // base grid cell px
const WIN_MX = 2;          // window margin x inside cell
const WIN_MY = 3;          // window margin y
const DOOR_H = 2;          // door height in cells (ground floor)
const SIGN_H = 1;          // signpost row height in cells

// ─── building types ─────────────────────────────────────────────────
const BLDG_TYPES = [
    { name: "Shop",            interior: "#1a1420" },
    { name: "Clothes",         interior: "#1a1828" },
    { name: "Mechanics",       interior: "#1c1a14" },
    { name: "Jewelry",         interior: "#201a22" },
    { name: "Salon",           interior: "#221a1e" },
    { name: "Bank",            interior: "#141a20" },
    { name: "Vegetables",      interior: "#161e14" },
    { name: "Hotel",           interior: "#1e1a16" },
    { name: "Bar",             interior: "#1e1418" },
    { name: "Crypto Exchange", interior: "#101820" },
] as const;

// ─── billboard ad content keyed by grid size ────────────────────────
const BB_ADS: Record<string, { text: string; color: string }[]> = {
    "2x2": [
        { text: "$FG",   color: "#4ade80" },
        { text: "BTC",   color: "#f7931a" },
        { text: "ETH",   color: "#627eea" },
        { text: "HODL",  color: "#fbbf24" },
    ],
    "3x2": [
        { text: "$FARTGIRL",  color: "#4ade80" },
        { text: "BUY CRYPTO", color: "#00b4ff" },
        { text: "TO THE MOON", color: "#fbbf24" },
        { text: "WEB3",       color: "#bf00ff" },
    ],
    "3x3": [
        { text: "FARTGIRL\nTO THE\nMOON",  color: "#4ade80" },
        { text: "BITCOIN\nDIGITAL\nGOLD",  color: "#f7931a" },
        { text: "CRYPTO\n  >\nBANKS",      color: "#00ffc8" },
    ],
    "4x3": [
        { text: "BUY $FARTGIRL\nBEFORE IT\nMOONS",  color: "#4ade80" },
        { text: "DIAMOND HANDS\nNEVER SELL",         color: "#00b4ff" },
    ],
};

// ─── types ──────────────────────────────────────────────────────────
interface CellWin { gx: number; gy: number; lit: boolean; color: string; flk: number }
interface BDoor { gx: number; gw: number }
interface Billboard { gx: number; gy: number; gw: number; gh: number; text: string; color: string }
interface FloorData { hasChadHere: boolean; chadShilled: boolean }
interface ShowWinAnim { phase: number; interval: number; frames: number[][] }
interface Bldg {
    x: number; gridW: number; gridH: number;
    color: string; typeIdx: number;
    cells: CellWin[];
    doors: BDoor[];
    billboards: Billboard[];
    floors: FloorData[];
    showWins: ShowWinAnim[];
    alley: boolean; alleyW: number;
}
interface SLight { x: number }
interface NPC {
    x: number; dir: number; spd: number; body: string; hat: string | null;
    f: number; targetX: number; paused: number;
}
interface Trail { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function rndI(lo: number, hi: number) { return Math.floor(rnd(lo, hi + 1)); }

export default function FartGirlGame() {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;

        let w = 1, h = 1, groundY = 1;
        const PAVE_H = 48, SIDE_H = 6;
        let camX = 0, raf = 0, tick = 0;

        // keys
        const keys: Record<string, boolean> = {};
        function kd(e: KeyboardEvent) {
            if ((e.key === "Enter" || e.key === " ") && !keys[e.key]) actionPressed = true;
            if (e.key === "Escape" && insideBldgIdx >= 0) {
                if (currentFloor > 0) currentFloor--;
                else insideBldgIdx = -1;
            }
            keys[e.key] = true;
            if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key)) e.preventDefault();
        }
        function ku(e: KeyboardEvent) { keys[e.key] = false; }
        window.addEventListener("keydown", kd);
        window.addEventListener("keyup", ku);

        function resize() {
            const dpr = devicePixelRatio || 1;
            const r = el!.getBoundingClientRect();
            w = r.width; h = r.height; groundY = h - PAVE_H;
            el!.width = Math.floor(w * dpr);
            el!.height = Math.floor(h * dpr);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener("resize", resize);

        // ── pixel art frames for show-windows ──
        function genShowWinFrames(): number[][] {
            const frames: number[][] = [];
            const nf = rndI(3, 5);
            for (let f = 0; f < nf; f++) {
                const px: number[] = [];
                for (let i = 0; i < 48; i++) px.push(Math.random() > 0.6 ? 1 : 0);
                const mx = (f * 2) % 8;
                for (let y = 2; y < 5; y++) px[y * 8 + mx] = 2;
                frames.push(px);
            }
            return frames;
        }

        // ── generate world ──
        const WORLD = 8000;
        const MAX_BLDGS = 50;
        const bldgs: Bldg[] = [];
        const slights: SLight[] = [];
        let bx = 60;

        while (bx < WORLD - 60 && bldgs.length < MAX_BLDGS) {
            const gridW = rndI(4, 8);
            let gridH = rndI(3, 10);
            const typeIdx = rndI(0, BLDG_TYPES.length - 1);
            if (BLDG_TYPES[typeIdx].name === "Hotel") gridH = Math.max(gridH, 6);
            const color = pick(BLDG_COLORS);

            const bodyStart = DOOR_H + SIGN_H; // first row above sign
            const cells: CellWin[] = [];
            for (let gy = bodyStart; gy < gridH; gy++) {
                for (let gx = 0; gx < gridW; gx++) {
                    cells.push({
                        gx, gy,
                        lit: Math.random() > 0.3,
                        color: pick(WIN_LIT),
                        flk: Math.random() * 1000,
                    });
                }
            }

            // doors
            const doors: BDoor[] = [];
            if (gridW >= 6) {
                doors.push({ gx: 1, gw: 2 });
                doors.push({ gx: gridW - 3, gw: 2 });
            } else {
                const dw = gridW >= 5 ? 2 : 1;
                doors.push({ gx: Math.floor((gridW - dw) / 2), gw: dw });
            }

            // show windows beside doors
            const doorCells = new Set<number>();
            for (const d of doors) for (let i = 0; i < d.gw; i++) doorCells.add(d.gx + i);
            const showWins: ShowWinAnim[] = [];
            for (let gx = 0; gx < gridW; gx++) {
                if (!doorCells.has(gx)) {
                    showWins.push({ phase: rnd(0, 1000), interval: rndI(60, 300), frames: genShowWinFrames() });
                }
            }

            // billboards (replace window cells)
            const billboards: Billboard[] = [];
            if (gridH > 4 && Math.random() > 0.5) {
                const sizes = [
                    [2, 2], [3, 2], [3, 3], [4, 3],
                ].filter(([bw, bh]) => bw <= gridW && bh <= gridH - bodyStart);
                if (sizes.length > 0) {
                    const [bbw, bbh] = pick(sizes);
                    const bbGx = rndI(0, gridW - bbw);
                    const bbGy = rndI(bodyStart, gridH - bbh);
                    const sizeKey = `${bbw}x${bbh}`;
                    const ads = BB_ADS[sizeKey] || BB_ADS["2x2"];
                    const ad = pick(ads);
                    billboards.push({ gx: bbGx, gy: bbGy, gw: bbw, gh: bbh, text: ad.text, color: ad.color });
                    for (let cy = bbGy; cy < bbGy + bbh; cy++)
                        for (let cx = bbGx; cx < bbGx + bbw; cx++) {
                            const idx = cells.findIndex(c => c.gx === cx && c.gy === cy);
                            if (idx >= 0) cells.splice(idx, 1);
                        }
                }
            }

            // floor data (one per grid row)
            const floors: FloorData[] = [];
            for (let f = 0; f < gridH; f++) floors.push({ hasChadHere: false, chadShilled: false });

            const alley = Math.random() > 0.5;
            const alleyW = alley ? rndI(10, 24) : 0;

            bldgs.push({
                x: bx, gridW, gridH, color, typeIdx,
                cells, doors, billboards, floors,
                showWins, alley, alleyW,
            });

            bx += gridW * CELL + alleyW + rndI(4, 12);
            if (Math.random() > 0.35) slights.push({ x: bx - alleyW / 2 - 2 });
        }

        // assign 20 chads to random building+floor combos (max 1 per floor)
        let investorCount = 0;
        const totalChads = Math.min(20, bldgs.length);
        const chadSlots: { bi: number; fi: number }[] = [];
        for (let bi = 0; bi < bldgs.length; bi++) {
            const b = bldgs[bi];
            const validFloors = [0];
            for (let f = DOOR_H + SIGN_H; f < b.gridH; f++) validFloors.push(f);
            for (const fi of validFloors) chadSlots.push({ bi, fi });
        }
        for (let i = chadSlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chadSlots[i], chadSlots[j]] = [chadSlots[j], chadSlots[i]];
        }
        const usedFloors = new Set<string>();
        let chadCount = 0;
        for (const slot of chadSlots) {
            if (chadCount >= totalChads) break;
            const key = `${slot.bi}-${slot.fi}`;
            if (usedFloors.has(key)) continue;
            usedFloors.add(key);
            bldgs[slot.bi].floors[slot.fi].hasChadHere = true;
            chadCount++;
        }

        // ── NPCs with random paths ──
        const NPC_C = ["60,60,100", "100,50,50", "40,80,90", "80,70,55", "70,50,90", "50,80,60"];
        const HAT_C: (string | null)[] = ["#e44", "#48f", "#fa0", null, null, null];
        const npcs: NPC[] = [];
        for (let i = 0; i < 40; i++) {
            const x = rnd(100, WORLD - 100);
            npcs.push({
                x, dir: Math.random() > 0.5 ? 1 : -1,
                spd: rnd(0.2, 0.7), body: pick(NPC_C), hat: pick(HAT_C),
                f: rnd(0, 100), targetX: x + rnd(-300, 300), paused: 0,
            });
        }

        function genNpcTarget(n: NPC) {
            n.targetX = n.x + rnd(-400, 400);
            n.targetX = Math.max(20, Math.min(WORLD - 20, n.targetX));
            n.dir = n.targetX > n.x ? 1 : -1;
            n.paused = rndI(60, 300);
        }

        // ── FartGirl ──
        let fgX = 300, fgDir = 1, fgFrame = 0, fgMoving = false;
        const FG_SPD = 2.4;
        const trail: Trail[] = [];

        // interior state
        let insideBldgIdx = -1;
        let currentFloor = 0; // 0 = ground, etc.
        let fgInsideX = 0;
        let nearDoorBldgIdx = -1;
        let nearInvestor = false;
        let nearStairsUp = false;
        let pitchAnim = 0;
        let actionPressed = false;

        // ── Physics hair ──
        const HAIR_SEGS = 5;
        const HAIR_SEG_LEN = 2.0;
        const STRAND_COUNT = 7;
        const hairStrands: { x: number; y: number; ox: number; oy: number }[][] = [];
        for (let s = 0; s < STRAND_COUNT; s++) {
            const chain: { x: number; y: number; ox: number; oy: number }[] = [];
            for (let i = 0; i < HAIR_SEGS; i++) chain.push({ x: 300, y: 0, ox: 300, oy: 0 });
            hairStrands.push(chain);
        }
        const strandAnchorsBehind = [
            { dx: -3.2, dy: -2.0 }, { dx: -2.4, dy: -2.8 }, { dx: -1.4, dy: -3.2 },
            { dx: -0.5, dy: -3.5 }, { dx: 0.3, dy: -3.4 }, { dx: 1.2, dy: -3.0 },
            { dx: 2.2, dy: -2.3 },
        ];

        function resetHair(rx: number, ry: number) {
            for (const chain of hairStrands)
                for (const n of chain) { n.x = rx; n.y = ry; n.ox = rx; n.oy = ry; }
        }

        function updateHair(headX: number, headY: number, scale: number) {
            for (let si = 0; si < STRAND_COUNT; si++) {
                const chain = hairStrands[si];
                const raw = strandAnchorsBehind[si];
                const anchorDx = -fgDir * Math.abs(raw.dx) + (raw.dx > 0 ? -fgDir * 0.3 : -fgDir * 0.1);
                chain[0].x = headX + anchorDx * scale;
                chain[0].y = headY + raw.dy * scale;
                for (let i = 1; i < HAIR_SEGS; i++) {
                    const n = chain[i];
                    const vx = (n.x - n.ox) * 0.94;
                    const vy = (n.y - n.oy) * 0.94;
                    n.ox = n.x; n.oy = n.y;
                    n.x += vx + (fgMoving ? -fgDir * 0.3 : 0) + Math.sin(tick * 0.07 + si) * 0.04;
                    n.y += vy + 0.15;
                }
                for (let iter = 0; iter < 3; iter++) {
                    for (let i = 0; i < HAIR_SEGS - 1; i++) {
                        const a = chain[i], b = chain[i + 1];
                        const ddx = b.x - a.x, ddy = b.y - a.y;
                        const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
                        const diff = (dist - HAIR_SEG_LEN * scale) / dist * 0.5;
                        if (i === 0) { b.x -= ddx * diff * 2; b.y -= ddy * diff * 2; }
                        else { a.x += ddx * diff; a.y += ddy * diff; b.x -= ddx * diff; b.y -= ddy * diff; }
                    }
                }
                for (let i = 1; i < HAIR_SEGS; i++) {
                    const n = chain[i];
                    const faceEdge = headX + fgDir * 2.5 * scale;
                    if (fgDir > 0 && n.x > faceEdge) { n.x = faceEdge; n.ox = n.x; }
                    else if (fgDir < 0 && n.x < faceEdge) { n.x = faceEdge; n.ox = n.x; }
                }
            }
        }

        // ── building dimension helpers ──
        function bldgPxW(b: Bldg) { return b.gridW * CELL; }
        function bldgPxH(b: Bldg) { return b.gridH * CELL; }

        // ── draw: person ──
        function drawPerson(px: number, py: number, dir: number, body: string, hat: string | null, f: number, sc: number) {
            const sx = px - camX, c = ctx!;
            if (sx < -40 || sx > w + 40) return;
            const s = sc;
            const bob = Math.sin(f * 0.12) * 1.2 * s;
            const ls = Math.sin(f * 0.12) * 2.5 * s;
            c.strokeStyle = `rgba(${body},0.9)`; c.lineWidth = 2 * s;
            c.beginPath();
            c.moveTo(sx - 1 * s, py - 6 * s + bob); c.lineTo(sx - ls, py);
            c.moveTo(sx + 1 * s, py - 6 * s + bob); c.lineTo(sx + ls, py);
            c.stroke();
            c.fillStyle = `rgba(${body},0.9)`;
            c.fillRect(sx - 3 * s, py - 14 * s + bob, 6 * s, 8 * s);
            const armSwing = Math.sin(f * 0.12) * 12 * s;
            c.lineWidth = 1.5 * s;
            c.beginPath();
            c.moveTo(sx - 3 * s, py - 12 * s + bob); c.lineTo(sx - 5 * s, py - 6 * s + bob + armSwing * 0.3);
            c.moveTo(sx + 3 * s, py - 12 * s + bob); c.lineTo(sx + 5 * s, py - 6 * s + bob - armSwing * 0.3);
            c.stroke();
            c.fillStyle = SKIN;
            c.beginPath(); c.arc(sx, py - 17 * s + bob, 3.5 * s, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#111";
            const eo = dir > 0 ? 1 : -1;
            c.fillRect(sx + eo * 1 * s - 0.5 * s, py - 18 * s + bob, 1 * s, 1 * s);
            c.fillRect(sx + eo * 2.5 * s - 0.5 * s, py - 18 * s + bob, 1 * s, 1 * s);
            if (hat) {
                c.fillStyle = hat;
                c.fillRect(sx - 4.5 * s, py - 21 * s + bob, 9 * s, 2.5 * s);
                c.fillRect(sx - 3 * s, py - 23 * s + bob, 6 * s, 2.5 * s);
            }
        }

        // ── draw: FartGirl ──
        function drawFG() {
            const sx = fgX - camX, py = groundY, s = 1.05, c = ctx!;
            const bob = fgMoving ? Math.sin(fgFrame * 0.14) * 1.2 : 0;
            if (fgMoving && tick % 4 === 0 && insideBldgIdx < 0)
                trail.push({ x: fgX - fgDir * 6, y: py - 5 + rnd(-3, 3), vx: -fgDir * rnd(0.2, 0.8), vy: rnd(-0.5, -0.1), life: 0, max: rnd(25, 50), r: rnd(1.5, 3.5) });
            const ls = fgMoving ? Math.sin(fgFrame * 0.14) * 2.5 * s : 0;
            c.fillStyle = "#1a1a1a";
            c.fillRect(sx - ls - 1.8 * s, py - 2 * s, 2 * s, 2 * s);
            c.fillRect(sx + ls - 0.2 * s, py - 2 * s, 2 * s, 2 * s);
            c.strokeStyle = FARTGIRL_GREEN; c.lineWidth = 2 * s;
            c.beginPath();
            c.moveTo(sx - 1 * s, py - 6 * s + bob); c.lineTo(sx - ls, py - 2 * s);
            c.moveTo(sx + 1 * s, py - 6 * s + bob); c.lineTo(sx + ls, py - 2 * s);
            c.stroke();
            const bt = py - 14 * s + bob;
            c.fillStyle = FARTGIRL_GREEN;
            c.beginPath();
            c.moveTo(sx - 3.5 * s, py - 6 * s + bob);
            c.lineTo(sx - 3.8 * s, bt + 2 * s);
            c.quadraticCurveTo(sx, bt - 0.5 * s, sx + 3.8 * s, bt + 2 * s);
            c.lineTo(sx + 3.5 * s, py - 6 * s + bob);
            c.closePath(); c.fill();
            c.fillStyle = "#fbbf24";
            c.fillRect(sx - 3.5 * s, py - 7 * s + bob, 7 * s, 1 * s);
            c.fillStyle = "#f59e0b";
            c.fillRect(sx - 1 * s, py - 7.3 * s + bob, 2 * s, 1.3 * s);
            const armS = fgMoving ? Math.sin(fgFrame * 0.14) * 10 : 0;
            c.strokeStyle = FARTGIRL_GREEN; c.lineWidth = 1.8 * s;
            c.beginPath();
            c.moveTo(sx - 3.5 * s, bt + 3 * s); c.lineTo(sx - 5.5 * s, py - 6 * s + bob + armS * 0.25);
            c.moveTo(sx + 3.5 * s, bt + 3 * s); c.lineTo(sx + 5.5 * s, py - 6 * s + bob - armS * 0.25);
            c.stroke();
            c.fillStyle = "#16a34a";
            c.beginPath();
            c.arc(sx - 5.5 * s, py - 6 * s + bob + armS * 0.25, 1.2 * s, 0, Math.PI * 2);
            c.arc(sx + 5.5 * s, py - 6 * s + bob - armS * 0.25, 1.2 * s, 0, Math.PI * 2);
            c.fill();
            const hY = bt - 2.5 * s;
            c.fillStyle = SKIN;
            c.beginPath(); c.arc(sx, hY, 3.5 * s, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#15803d";
            c.beginPath(); c.ellipse(sx, hY - 0.3 * s, 3.8 * s, 1.4 * s, 0, 0, Math.PI * 2); c.fill();
            const ed = fgDir > 0 ? 1 : -1;
            c.fillStyle = "#fff";
            c.beginPath();
            c.ellipse(sx + ed * 1.2 * s, hY - 0.3 * s, 0.9 * s, 0.7 * s, 0, 0, Math.PI * 2);
            c.ellipse(sx + ed * 3 * s, hY - 0.3 * s, 0.9 * s, 0.7 * s, 0, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = "#111";
            c.beginPath();
            c.arc(sx + ed * 1.6 * s, hY - 0.3 * s, 0.35 * s, 0, Math.PI * 2);
            c.arc(sx + ed * 3.4 * s, hY - 0.3 * s, 0.35 * s, 0, Math.PI * 2);
            c.fill();
            updateHair(fgX, hY, s);
            c.fillStyle = "#4ade80";
            c.beginPath();
            c.moveTo(sx - 3.8 * s, hY - 1 * s);
            c.quadraticCurveTo(sx, hY - 5.5 * s, sx + 3.8 * s, hY - 1 * s);
            c.fill();
            c.lineCap = "round";
            const strandColors = ["#4ade80", "#22c55e", "#86efac", "#4ade80", "#86efac", "#22c55e", "#4ade80"];
            for (let si = 0; si < STRAND_COUNT; si++) {
                const chain = hairStrands[si];
                c.strokeStyle = strandColors[si];
                c.beginPath(); c.moveTo(chain[0].x - camX, chain[0].y);
                for (let i = 1; i < HAIR_SEGS; i++) {
                    const prev = chain[i - 1], cur = chain[i];
                    c.quadraticCurveTo(prev.x - camX, prev.y, (prev.x - camX + cur.x - camX) / 2, (prev.y + cur.y) / 2);
                }
                c.lineWidth = (1.6 - si * 0.05) * s; c.stroke();
            }
            c.lineCap = "butt";
            c.fillStyle = "rgba(34,197,94,0.4)";
            c.beginPath();
            c.moveTo(sx - 2 * s, bt + 1.5 * s);
            c.quadraticCurveTo(sx - fgDir * 10 * s, py - 9 * s + Math.sin(tick * 0.06) * 2.5, sx - fgDir * 7 * s, py - 1.5 * s);
            c.lineTo(sx - fgDir * 4 * s, py - 3 * s);
            c.quadraticCurveTo(sx - fgDir * 6 * s, py - 10 * s, sx - 0.5 * s, bt + 1.5 * s);
            c.closePath(); c.fill();
            c.font = `bold ${4 * s}px monospace`; c.fillStyle = "#fbbf24"; c.textAlign = "center";
            c.fillText("$", sx, bt + 6 * s);
        }

        // ── draw: trail ──
        function drawTrail() {
            const c = ctx!;
            c.globalCompositeOperation = "lighter";
            for (let i = trail.length - 1; i >= 0; i--) {
                const p = trail[i];
                p.life++; p.x += p.vx; p.y += p.vy; p.vy -= 0.01;
                const t = p.life / p.max, a = (1 - t) * 0.35;
                if (a <= 0 || p.life > p.max) { trail.splice(i, 1); continue; }
                const sx = p.x - camX;
                if (sx < -20 || sx > w + 20) continue;
                c.fillStyle = `rgba(80,255,80,${a})`;
                c.beginPath(); c.arc(sx, p.y, p.r * (1 + t * 0.8), 0, Math.PI * 2); c.fill();
            }
            c.globalCompositeOperation = "source-over";
            if (trail.length > 200) trail.splice(0, trail.length - 200);
        }

        // ── draw: building exterior ──
        function drawBldg(b: Bldg) {
            const bpw = bldgPxW(b), bph = bldgPxH(b);
            const bsx = b.x - camX;
            if (bsx + bpw < -10 || bsx > w + 10) return;
            const c = ctx!;
            const by = groundY - bph;

            // body
            c.fillStyle = b.color; c.fillRect(bsx, by, bpw, bph);
            c.fillStyle = "rgba(120,140,180,0.12)"; c.fillRect(bsx, by, bpw, 1);
            c.fillStyle = "rgba(180,200,240,0.06)"; c.fillRect(bsx, by, 1, bph); c.fillRect(bsx + bpw - 1, by, 1, bph);

            // signpost row (building name)
            const signY = groundY - (DOOR_H + 1) * CELL;
            const typeName = BLDG_TYPES[b.typeIdx].name.toUpperCase();
            c.fillStyle = "rgba(0,0,0,0.6)";
            c.fillRect(bsx + 2, signY + 2, bpw - 4, CELL - 4);
            c.fillStyle = "#e0d8c0"; c.font = "bold 8px sans-serif"; c.textAlign = "center";
            c.fillText(typeName, bsx + bpw / 2, signY + CELL / 2 + 3);

            // ground-floor show windows (beside doors)
            const doorCells = new Set<number>();
            for (const d of b.doors) for (let i = 0; i < d.gw; i++) doorCells.add(d.gx + i);
            let swIdx = 0;
            for (let gx = 0; gx < b.gridW; gx++) {
                if (doorCells.has(gx)) continue;
                const wx = bsx + gx * CELL + 1;
                const wy = groundY - DOOR_H * CELL + 1;
                const ww = CELL - 2, wh = DOOR_H * CELL - 2;
                // green glow if ground floor has chad
                const gf = b.floors[0];
                if (gf.hasChadHere && !gf.chadShilled && gx === 0) {
                    const pulse = 0.3 + Math.sin(tick * 0.05) * 0.2;
                    c.fillStyle = `rgba(34,197,94,${pulse})`; c.fillRect(wx, wy, ww, wh);
                    if (tick % 10 < 3) {
                        c.fillStyle = "rgba(74,222,128,0.3)";
                        c.beginPath(); c.arc(wx + ww / 2, wy - 2 + Math.sin(tick * 0.12) * 2, 1.5, 0, Math.PI * 2); c.fill();
                    }
                } else {
                    c.fillStyle = "rgba(200,180,120,0.08)"; c.fillRect(wx, wy, ww, wh);
                }
                c.strokeStyle = "rgba(150,140,100,0.3)"; c.lineWidth = 0.5; c.strokeRect(wx, wy, ww, wh);
                // animated pixel art
                if (swIdx < b.showWins.length) {
                    const sw = b.showWins[swIdx];
                    const fi = Math.floor((tick + sw.phase) / sw.interval) % sw.frames.length;
                    const frame = sw.frames[fi];
                    const pxS = ww / 8;
                    for (let py = 0; py < 6; py++) for (let px = 0; px < 8; px++) {
                        const v = frame[py * 8 + px];
                        if (v === 1) { c.fillStyle = "rgba(255,200,100,0.15)"; c.fillRect(wx + px * pxS, wy + py * (wh / 6), pxS, wh / 6); }
                        else if (v === 2) { c.fillStyle = "rgba(255,240,180,0.25)"; c.fillRect(wx + px * pxS, wy + py * (wh / 6), pxS, wh / 6); }
                    }
                    swIdx++;
                }
            }

            // doors
            for (const d of b.doors) {
                const dx = bsx + d.gx * CELL;
                const dw = d.gw * CELL, dh = DOOR_H * CELL;
                const dy = groundY - dh;
                c.fillStyle = "rgba(8,8,16,0.95)"; c.fillRect(dx, dy, dw, dh);
                c.strokeStyle = "rgba(100,100,140,0.3)"; c.lineWidth = 0.5; c.strokeRect(dx, dy, dw, dh);
                if (d.gw >= 2) { c.fillStyle = "rgba(60,60,80,0.3)"; c.fillRect(dx + dw / 2 - 0.5, dy, 1, dh); }
                c.fillStyle = "rgba(200,180,100,0.5)";
                c.beginPath(); c.arc(dx + dw - 4, dy + dh * 0.55, 1.2, 0, Math.PI * 2); c.fill();
                c.fillStyle = "rgba(255,200,100,0.25)"; c.fillRect(dx + 1, dy - 2, dw - 2, 2);
            }

            // upper-floor windows
            const bbSet = new Set<string>();
            for (const bb of b.billboards)
                for (let cy = bb.gy; cy < bb.gy + bb.gh; cy++)
                    for (let cx = bb.gx; cx < bb.gx + bb.gw; cx++)
                        bbSet.add(`${cx},${cy}`);

            for (const win of b.cells) {
                if (bbSet.has(`${win.gx},${win.gy}`)) continue;
                const wx = bsx + win.gx * CELL + WIN_MX;
                const wy = by + win.gy * CELL + WIN_MY;
                const ww = CELL - WIN_MX * 2, wh = CELL - WIN_MY * 2;
                const fd = b.floors[win.gy];
                c.fillStyle = "rgba(5,5,14,0.9)"; c.fillRect(wx - 0.5, wy - 0.5, ww + 1, wh + 1);
                if (fd && fd.hasChadHere && !fd.chadShilled) {
                    const pulse = 0.4 + Math.sin((tick + win.flk) * 0.04) * 0.25;
                    c.fillStyle = `rgba(34,197,94,${pulse})`; c.fillRect(wx, wy, ww, wh);
                    if (tick % 8 < 2) {
                        c.fillStyle = `rgba(74,222,128,${0.3 + Math.sin(tick * 0.1 + win.flk) * 0.15})`;
                        c.beginPath();
                        c.arc(wx + ww / 2 + Math.sin(tick * 0.15 + win.flk) * 3, wy - 2 + Math.sin(tick * 0.1) * 2, 1.5, 0, Math.PI * 2);
                        c.fill();
                    }
                } else if (fd && fd.chadShilled) {
                    const pulse = 0.55 + Math.sin((tick + win.flk) * 0.03) * 0.3;
                    c.fillStyle = `rgba(34,197,94,${pulse})`; c.fillRect(wx, wy, ww, wh);
                    c.fillStyle = `rgba(74,222,128,${pulse * 0.15})`; c.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
                } else if (win.lit) {
                    const br = 0.6 + Math.sin((tick + win.flk) * 0.02) * 0.15;
                    c.globalAlpha = br; c.fillStyle = win.color; c.fillRect(wx, wy, ww, wh);
                    c.fillStyle = "#fff"; c.globalAlpha = br * 0.15; c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    c.globalAlpha = 1;
                } else {
                    c.fillStyle = "rgba(18,18,28,0.85)"; c.fillRect(wx, wy, ww, wh);
                }
            }

            // billboards with volumetric top-light
            for (const bb of b.billboards) {
                const bbx = bsx + bb.gx * CELL;
                const bby = by + bb.gy * CELL;
                const bbw = bb.gw * CELL, bbh = bb.gh * CELL;
                c.fillStyle = "#06060e"; c.fillRect(bbx, bby, bbw, bbh);
                c.strokeStyle = "rgba(160,170,200,0.5)"; c.lineWidth = 1.5; c.strokeRect(bbx, bby, bbw, bbh);
                // light fixture
                c.fillStyle = "rgba(200,200,220,0.8)";
                c.fillRect(bbx + bbw * 0.15, bby - 3, bbw * 0.7, 3);
                // volumetric cone
                c.save(); c.globalCompositeOperation = "lighter";
                const lg = c.createLinearGradient(bbx, bby, bbx, bby + bbh);
                lg.addColorStop(0, "rgba(255,255,240,0.12)");
                lg.addColorStop(1, "rgba(255,255,240,0)");
                c.fillStyle = lg; c.fillRect(bbx, bby, bbw, bbh);
                c.restore();
                // text
                const lines = bb.text.split("\n");
                const fontSize = Math.max(6, Math.min(9, bbh / (lines.length + 1)));
                c.font = `bold ${fontSize}px monospace`; c.textAlign = "center"; c.fillStyle = bb.color;
                for (let li = 0; li < lines.length; li++)
                    c.fillText(lines[li], bbx + bbw / 2, bby + fontSize + li * (fontSize + 2) + 2);
                if (bb.text.includes("FARTGIRL") || bb.text.includes("$FG")) {
                    c.fillStyle = "#4ade80";
                    c.beginPath(); c.arc(bbx + 8, bby + bbh - 8, 5, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "#fbbf24"; c.font = "bold 5px monospace"; c.textAlign = "center";
                    c.fillText("$F", bbx + 8, bby + bbh - 6);
                }
            }

            // alley
            if (b.alley) {
                c.fillStyle = "rgba(0,0,0,0.5)";
                c.fillRect(bsx + bpw, groundY - Math.min(bph, 80), b.alleyW, Math.min(bph, 80));
            }
        }

        // ── draw: street light (fixed glow — radial, no cutoff) ──
        function drawSL(sl: SLight) {
            const sx = sl.x - camX, c = ctx!;
            if (sx < -60 || sx > w + 60) return;
            const pH = 45;
            c.fillStyle = "rgba(80,80,100,0.7)";
            c.fillRect(sx - 1, groundY - pH, 2, pH);
            c.fillRect(sx - 6, groundY - pH, 12, 2);
            const fl = 0.85 + Math.sin(tick * 0.05 + sl.x * 0.1) * 0.1;
            // radial glow from bulb
            const g = c.createRadialGradient(sx, groundY - pH + 3, 0, sx, groundY - pH + 3, 55);
            g.addColorStop(0, `rgba(255,220,130,${0.25 * fl})`);
            g.addColorStop(0.5, `rgba(255,220,130,${0.1 * fl})`);
            g.addColorStop(1, "rgba(255,220,130,0)");
            c.fillStyle = g;
            c.beginPath(); c.arc(sx, groundY - pH + 3, 55, 0, Math.PI * 2); c.fill();
            // ground pool
            const gp = c.createRadialGradient(sx, groundY, 0, sx, groundY, 40);
            gp.addColorStop(0, `rgba(255,220,130,${0.08 * fl})`);
            gp.addColorStop(1, "rgba(255,220,130,0)");
            c.fillStyle = gp;
            c.fillRect(sx - 40, groundY - 5, 80, 10);
            // bulb
            c.fillStyle = `rgba(255,240,180,${0.9 * fl})`;
            c.beginPath(); c.arc(sx, groundY - pH + 3, 2.5, 0, Math.PI * 2); c.fill();
        }

        // ── draw: hoodie dude (chad) ──
        function drawHoodieDude(x: number, fy: number, greenPhone: boolean) {
            const c = ctx!;
            c.fillStyle = "#18182a";
            c.fillRect(x - 3, fy - 5, 2.5, 5); c.fillRect(x + 0.5, fy - 5, 2.5, 5);
            c.fillStyle = "#1a1a2c";
            c.beginPath();
            c.moveTo(x - 6, fy - 5); c.lineTo(x - 5, fy - 22); c.lineTo(x + 5, fy - 22); c.lineTo(x + 6, fy - 5);
            c.closePath(); c.fill();
            c.beginPath(); c.arc(x, fy - 24, 6, Math.PI, 0); c.fill();
            c.fillStyle = "#161626";
            c.beginPath(); c.arc(x, fy - 24, 4, 0, Math.PI * 2); c.fill();
            const pc = greenPhone ? "34,197,94" : "140,180,255";
            c.fillStyle = `rgba(${pc},0.15)`;
            c.beginPath(); c.arc(x + 0.5, fy - 24, 3.5, 0, Math.PI * 2); c.fill();
            const phX = x + 5, phY = fy - 16;
            c.strokeStyle = "#1a1a2c"; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x + 5, fy - 20); c.lineTo(phX, phY); c.stroke();
            c.fillStyle = greenPhone ? "#22c55e" : "#8ab4f8";
            c.fillRect(phX - 1.5, phY - 3, 3, 5);
            c.fillStyle = "#fff"; c.fillRect(phX - 1, phY - 2.5, 2, 4);
            c.fillStyle = greenPhone ? "rgba(34,197,94,0.4)" : "rgba(140,180,255,0.3)";
            c.fillRect(phX - 1, phY - 2.5, 2, 4);
            c.save(); c.globalCompositeOperation = "lighter";
            const lg = c.createRadialGradient(phX, phY - 1, 0, phX, phY - 1, 28);
            lg.addColorStop(0, `rgba(${pc},0.25)`); lg.addColorStop(0.4, `rgba(${pc},0.08)`); lg.addColorStop(1, `rgba(${pc},0)`);
            c.fillStyle = lg; c.fillRect(phX - 28, phY - 29, 56, 32);
            c.fillStyle = `rgba(${pc},0.08)`;
            c.beginPath();
            c.moveTo(phX - 1, phY - 2); c.lineTo(x - 5, fy - 30); c.lineTo(x + 3, fy - 30); c.lineTo(phX + 1, phY - 2);
            c.closePath(); c.fill();
            c.restore();
        }

        // ── draw: popup ──
        function drawPopup(text: string, px: number, py: number) {
            const c = ctx!;
            c.font = "bold 10px sans-serif";
            const tw = c.measureText(text).width;
            c.fillStyle = "rgba(0,0,0,0.85)";
            c.beginPath(); c.roundRect(px - tw / 2 - 8, py - 10, tw + 16, 20, 5); c.fill();
            c.strokeStyle = "rgba(34,197,94,0.5)"; c.lineWidth = 1;
            c.beginPath(); c.roundRect(px - tw / 2 - 8, py - 10, tw + 16, 20, 5); c.stroke();
            c.fillStyle = "#4ade80"; c.textAlign = "center";
            c.fillText(text, px, py + 3);
        }

        // ── draw: HUD ──
        function drawHUD() {
            const c = ctx!;
            const text = `${investorCount}/20 Investors`;
            c.font = "bold 13px sans-serif"; c.textAlign = "right";
            const tw = c.measureText(text).width;
            c.fillStyle = "rgba(0,0,0,0.7)";
            c.beginPath(); c.roundRect(w - tw - 26, 8, tw + 18, 24, 6); c.fill();
            c.strokeStyle = investorCount >= 20 ? "rgba(251,191,36,0.5)" : "rgba(34,197,94,0.3)";
            c.lineWidth = 1;
            c.beginPath(); c.roundRect(w - tw - 26, 8, tw + 18, 24, 6); c.stroke();
            c.fillStyle = investorCount >= 20 ? "#fbbf24" : "#4ade80";
            c.fillText(text, w - 16, 25);
            if (investorCount >= 20) {
                c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, h / 2 - 30, w, 60);
                c.fillStyle = "#fbbf24"; c.font = "bold 24px sans-serif"; c.textAlign = "center";
                c.fillText("ALL INVESTORS SECURED!", w / 2, h / 2 + 8);
            }
        }

        // ── map floor index to a renderable floor number ──
        // gridH rows: row 0 = ground, row 1 = door top, row 2 = sign, row 3+ = upper floors
        // We allow entering floors 0 (ground) and DOOR_H+SIGN_H .. gridH-1 (upper)
        function validFloorIndices(b: Bldg): number[] {
            const out = [0];
            for (let f = DOOR_H + SIGN_H; f < b.gridH; f++) out.push(f);
            return out;
        }
        function floorDisplayNum(fi: number): number {
            if (fi === 0) return 0;
            return fi - DOOR_H - SIGN_H + 1;
        }

        // ── draw: interior scene ──
        function drawInterior() {
            const c = ctx!;
            const b = bldgs[insideBldgIdx];
            const bt = BLDG_TYPES[b.typeIdx];
            const vFloors = validFloorIndices(b);
            const curFloorIdx = vFloors[currentFloor] ?? 0;
            const totalVFloors = vFloors.length;
            const roomW = Math.min(w * 0.85, 520);
            const roomH = 140;
            const roomX = (w - roomW) / 2;
            const roomY = h / 2 - roomH / 2 + 20;
            const floorY = roomY + roomH;

            c.fillStyle = "#050510"; c.fillRect(0, 0, w, h);
            c.fillStyle = bt.interior; c.fillRect(roomX, roomY, roomW, roomH);
            c.fillStyle = "#1e1e30"; c.fillRect(roomX, floorY, roomW, 25);
            c.fillStyle = "rgba(80,80,120,0.12)"; c.fillRect(roomX, roomY, roomW, 2);
            c.strokeStyle = "rgba(255,255,255,0.015)"; c.lineWidth = 1;
            for (let ly = roomY + 18; ly < floorY; ly += 14) {
                c.beginPath(); c.moveTo(roomX, ly); c.lineTo(roomX + roomW, ly); c.stroke();
            }
            c.fillStyle = "rgba(40,40,60,0.2)";
            c.fillRect(roomX, roomY, 3, roomH + 25);
            c.fillRect(roomX + roomW - 3, roomY, 3, roomH + 25);

            // floor label
            c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "10px sans-serif"; c.textAlign = "center";
            const label = currentFloor === 0 ? "Ground Floor" : `Floor ${floorDisplayNum(curFloorIdx)}`;
            c.fillText(`${bt.name} \u2014 ${label}  (${currentFloor + 1}/${totalVFloors})`, w / 2, roomY - 8);

            // exit / stairs-down (left side)
            const doorW = 20, doorH2 = 36;
            const doorX = roomX + 6;
            c.fillStyle = "#0a0a16"; c.fillRect(doorX, floorY - doorH2, doorW, doorH2);
            c.strokeStyle = "rgba(100,100,140,0.4)"; c.lineWidth = 0.5; c.strokeRect(doorX, floorY - doorH2, doorW, doorH2);
            c.fillStyle = "rgba(200,180,100,0.5)"; c.beginPath(); c.arc(doorX + doorW - 3, floorY - doorH2 / 2, 1, 0, Math.PI * 2); c.fill();
            if (currentFloor === 0) {
                c.fillStyle = "#ff4444"; c.font = "bold 7px monospace"; c.textAlign = "center";
                c.fillText("EXIT", doorX + doorW / 2, floorY - doorH2 - 3);
            } else {
                c.fillStyle = "#aaa"; c.font = "bold 6px monospace"; c.textAlign = "center";
                c.fillText("\u2193 DOWN", doorX + doorW / 2, floorY - doorH2 - 3);
            }

            // stairs up (right side) — if not top floor
            const stairX = roomX + roomW - 28;
            const stairW = 22, stairH2 = 36;
            if (currentFloor < totalVFloors - 1) {
                c.fillStyle = "#0a0a16"; c.fillRect(stairX, floorY - stairH2, stairW, stairH2);
                c.strokeStyle = "rgba(100,100,140,0.4)"; c.lineWidth = 0.5; c.strokeRect(stairX, floorY - stairH2, stairW, stairH2);
                for (let si = 0; si < 4; si++) {
                    c.fillStyle = "rgba(100,100,140,0.3)";
                    c.fillRect(stairX + 3 + si * 4, floorY - 8 - si * 7, stairW - 6, 2);
                }
                c.fillStyle = "#4ade80"; c.font = "bold 6px monospace"; c.textAlign = "center";
                c.fillText("\u2191 UP", stairX + stairW / 2, floorY - stairH2 - 3);
            }

            // chad on this floor?
            const fd = b.floors[curFloorIdx];
            const chadX = roomX + roomW * 0.55;
            if (fd && fd.hasChadHere) {
                drawHoodieDude(chadX, floorY, fd.chadShilled);
                if (!fd.chadShilled) {
                    c.fillStyle = "#fbbf24"; c.font = "bold 8px sans-serif"; c.textAlign = "center";
                    c.fillText("CHAD", chadX, floorY - 38);
                }
            } else {
                c.fillStyle = "rgba(255,255,255,0.08)"; c.font = "9px sans-serif"; c.textAlign = "center";
                c.fillText("~", roomX + roomW * 0.5, floorY - 15);
            }

            // draw FartGirl
            const savedFgX = fgX, savedCamX = camX, savedGY = groundY;
            fgX = roomX + fgInsideX; camX = 0; groundY = floorY;
            drawFG();
            fgX = savedFgX; camX = savedCamX; groundY = savedGY;

            // proximity
            const fgSX = roomX + fgInsideX;
            const isNearExit = fgSX < doorX + doorW + 20;
            nearStairsUp = currentFloor < totalVFloors - 1 && Math.abs(fgSX - (stairX + stairW / 2)) < 25;
            nearInvestor = !!(fd && fd.hasChadHere && !fd.chadShilled && Math.abs(fgSX - chadX) < 45 && pitchAnim === 0);

            if (pitchAnim === 0) {
                if (isNearExit && !nearStairsUp) {
                    drawPopup(currentFloor === 0 ? "ENTER to exit" : "ENTER to go down", fgSX, floorY - 55);
                } else if (nearStairsUp) {
                    drawPopup("ENTER to go up", fgSX, floorY - 55);
                } else if (nearInvestor) {
                    drawPopup("Shill $FG to the Chad [ENTER]", fgSX, floorY - 55);
                } else if (fd && fd.hasChadHere && !fd.chadShilled) {
                    c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "9px sans-serif"; c.textAlign = "center";
                    c.fillText("\u2192 Walk to the Chad", fgSX, floorY - 55);
                } else if (fd && fd.chadShilled) {
                    c.fillStyle = "#4ade80"; c.font = "bold 9px sans-serif"; c.textAlign = "center";
                    c.fillText("Chad is shilled! \u2713", chadX, floorY - 42);
                }
            }

            // pitch animation
            if (pitchAnim > 0) {
                pitchAnim--;
                const t = pitchAnim / 60;
                c.globalAlpha = t * 0.5; c.fillStyle = "#22c55e";
                for (let i = 0; i < 6; i++) {
                    const px = fgSX + (chadX - fgSX) * (1 - t) * 0.8 + Math.sin(tick * 0.3 + i * 1.2) * 12;
                    const py = floorY - 15 + Math.cos(tick * 0.2 + i * 1.8) * 8;
                    c.beginPath(); c.arc(px, py, 5 + i * 2, 0, Math.PI * 2); c.fill();
                }
                c.globalAlpha = 1;
                if (pitchAnim === 0) { fd!.chadShilled = true; investorCount++; }
            }

            drawHUD();
        }

        // ── mobile touch ──
        let tL = false, tR = false;
        function ts(e: TouchEvent) {
            for (let i = 0; i < e.touches.length; i++) {
                const r = el!.getBoundingClientRect();
                const lx = e.touches[i].clientX - r.left;
                if (lx < w / 2) tL = true; else tR = true;
            }
        }
        function te() { tL = false; tR = false; }
        el.addEventListener("touchstart", ts, { passive: true });
        el.addEventListener("touchend", te, { passive: true });
        el.addEventListener("touchcancel", te, { passive: true });

        function canvasClick() { actionPressed = true; }
        el.addEventListener("click", canvasClick);

        // ── main loop ──
        function loop() {
            tick++;
            const c = ctx!;

            if (insideBldgIdx >= 0) {
                // ── Interior mode ──
                fgMoving = false;
                if (keys["ArrowLeft"] || keys["a"] || tL) { fgInsideX -= FG_SPD; fgDir = -1; fgMoving = true; }
                if (keys["ArrowRight"] || keys["d"] || tR) { fgInsideX += FG_SPD; fgDir = 1; fgMoving = true; }
                if (fgMoving) fgFrame++;
                const roomW = Math.min(w * 0.85, 520);
                fgInsideX = Math.max(12, Math.min(roomW - 12, fgInsideX));

                const roomX = (w - roomW) / 2;
                const fgSX = roomX + fgInsideX;
                const doorEnd = roomX + 6 + 20 + 20;
                const isNearExit = fgSX < doorEnd;

                const b = bldgs[insideBldgIdx];
                const vFloors = validFloorIndices(b);
                const curFloorIdx = vFloors[currentFloor] ?? 0;
                const fd = b.floors[curFloorIdx];
                const chadX = roomX + roomW * 0.55;
                const stairCenterX = roomX + roomW - 28 + 11;
                nearStairsUp = currentFloor < vFloors.length - 1 && Math.abs(fgSX - stairCenterX) < 25;
                nearInvestor = !!(fd && fd.hasChadHere && !fd.chadShilled && Math.abs(fgSX - chadX) < 45 && pitchAnim === 0);

                if (actionPressed) {
                    if (nearStairsUp && pitchAnim === 0) {
                        currentFloor++;
                        fgInsideX = 50;
                        resetHair(roomX + 50, 0);
                    } else if (isNearExit && pitchAnim === 0) {
                        if (currentFloor > 0) {
                            currentFloor--;
                            fgInsideX = roomW - 40;
                            resetHair(roomX + roomW - 40, 0);
                        } else {
                            insideBldgIdx = -1;
                            resetHair(fgX, groundY - 20);
                        }
                    } else if (nearInvestor && pitchAnim === 0) {
                        pitchAnim = 60;
                    }
                }

                if (insideBldgIdx >= 0) drawInterior();
            } else {
                // ── Exterior mode ──
                fgMoving = false;
                if (keys["ArrowLeft"] || keys["a"] || tL) { fgX -= FG_SPD; fgDir = -1; fgMoving = true; }
                if (keys["ArrowRight"] || keys["d"] || tR) { fgX += FG_SPD; fgDir = 1; fgMoving = true; }
                if (fgMoving) fgFrame++;
                fgX = Math.max(0, Math.min(WORLD, fgX));

                const tgt = fgX - w / 2;
                camX += (tgt - camX) * 0.08;
                camX = Math.max(0, Math.min(WORLD - w, camX));

                // NPC pathing
                for (const n of npcs) {
                    if (n.paused > 0) { n.paused--; continue; }
                    n.x += n.spd * n.dir; n.f += n.spd;
                    if (Math.abs(n.x - n.targetX) < 5) genNpcTarget(n);
                    if (n.x < -50 || n.x > WORLD + 50) genNpcTarget(n);
                }

                // door proximity
                nearDoorBldgIdx = -1;
                for (let bi = 0; bi < bldgs.length; bi++) {
                    const b = bldgs[bi];
                    for (const d of b.doors) {
                        const doorWorldX = b.x + d.gx * CELL + (d.gw * CELL) / 2;
                        if (Math.abs(fgX - doorWorldX) < 16) { nearDoorBldgIdx = bi; break; }
                    }
                    if (nearDoorBldgIdx >= 0) break;
                }

                if (nearDoorBldgIdx >= 0 && actionPressed) {
                    insideBldgIdx = nearDoorBldgIdx;
                    currentFloor = 0;
                    fgInsideX = 60;
                    actionPressed = false;
                    const rw = Math.min(w * 0.85, 520);
                    resetHair((w - rw) / 2 + 60, 0);
                }

                // ── draw exterior ──
                c.fillStyle = SKY; c.fillRect(0, 0, w, h);
                c.fillStyle = "rgba(255,255,255,0.5)";
                for (let i = 0; i < 60; i++) {
                    const stX = ((i * 97.3 + 13) % w + (camX * 0.02) % w + w) % w;
                    const stY = (i * 53.7 + 7) % (groundY * 0.6);
                    c.beginPath(); c.arc(stX, stY, ((i * 17) % 3) * 0.3 + 0.3, 0, Math.PI * 2); c.fill();
                }
                const mOff = (camX * 0.01) % 20;
                c.fillStyle = "rgba(240,240,255,0.85)"; c.beginPath(); c.arc(w - 80 + mOff, 60, 22, 0, Math.PI * 2); c.fill();
                c.fillStyle = SKY; c.beginPath(); c.arc(w - 72 + mOff, 55, 18, 0, Math.PI * 2); c.fill();

                for (const b of bldgs) drawBldg(b);
                for (const sl of slights) drawSL(sl);

                c.fillStyle = GROUND; c.fillRect(0, groundY, w, PAVE_H);
                c.fillStyle = PAVEMENT; c.fillRect(0, groundY, w, SIDE_H);
                c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(0, groundY + PAVE_H / 2 - 0.5, w, 1);
                c.strokeStyle = "rgba(255,200,50,0.15)"; c.lineWidth = 1; c.setLineDash([12, 18]);
                c.beginPath(); c.moveTo(0, groundY + PAVE_H / 2); c.lineTo(w, groundY + PAVE_H / 2); c.stroke();
                c.setLineDash([]);

                for (const n of npcs) drawPerson(n.x, groundY, n.dir, n.body, n.hat, n.f, 1.0);
                drawTrail();
                drawFG();

                if (nearDoorBldgIdx >= 0) {
                    drawPopup("ENTER to go inside", fgX - camX, groundY - 35);
                }

                drawHUD();
            }

            actionPressed = false;

            c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "12px sans-serif"; c.textAlign = "center";
            if (insideBldgIdx < 0) {
                c.fillText("\u2190 \u2192 to move  \u2022  ENTER at doors  \u2022  Touch/click", w / 2, h - 8);
            } else {
                c.fillText("\u2190 \u2192 to move  \u2022  ENTER to interact  \u2022  ESC to go back", w / 2, h - 8);
            }

            raf = requestAnimationFrame(loop);
        }

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            window.removeEventListener("keydown", kd);
            window.removeEventListener("keyup", ku);
            el.removeEventListener("touchstart", ts);
            el.removeEventListener("touchend", te);
            el.removeEventListener("touchcancel", te);
            el.removeEventListener("click", canvasClick);
        };
    }, []);

    return (
        <section
            id="game"
            className="relative w-full bg-black"
        >
            <div className="text-center pt-10 pb-4">
                <h2 className="text-4xl sm:text-5xl font-black">
                    <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
                        FartGirl Game
                    </span>
                </h2>
                <p className="text-gray-400 mt-2 text-sm sm:text-base">Explore the city, find chads, shill $FARTGIRL!</p>
            </div>
            <div style={{ height: "70vh", minHeight: 420, position: "relative" }}>
                <canvas
                    ref={ref}
                    className="absolute inset-0 w-full h-full"
                    style={{ touchAction: "none" }}
                    tabIndex={0}
                />
            </div>
        </section>
    );
}
