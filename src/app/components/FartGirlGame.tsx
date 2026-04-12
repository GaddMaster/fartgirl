"use client";

import { useEffect, useRef } from "react";
import { BILLBOARD_ART, BillboardSizeKey } from "./billboard-art";

// ─── palette ────────────────────────────────────────────────────────
const SKY = "#0a0a1a";
const GROUND = "#1a1a2e";
const PAVEMENT = "#2a2a3e";
const BLDG_COLORS = ["#12121e", "#0f0f1a", "#161628", "#1a1a30", "#111122"];
const WIN_LIT = ["#ffcc66", "#aaddff", "#ffd480", "#66ffaa", "#ff99cc"];
const SKIN = "rgba(220,190,160,0.95)";
const FARTGIRL_GREEN = "#22c55e";

// ─── grid constants ─────────────────────────────────────────────────
const CELL = 16;
const GAP = 4;
const STEP = CELL + GAP;
const FLOOR_H = 2;
function span(n: number) { return n * CELL + Math.max(0, n - 1) * GAP; }
function bldgW(cols: number) { return cols * STEP + GAP; }
function bldgH(stories: number) { return stories * FLOOR_H * STEP; }
function cellLX(col: number) { return GAP + col * STEP; }
function floorLY(stories: number, f: number) {
    return GAP + (stories - 1 - f) * FLOOR_H * STEP;
}

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

// ─── ground floor element ───────────────────────────────────────────
interface GroundEl { gx: number; gw: number; type: "door" | "window" | "garage" }

// ─── building layout definitions ────────────────────────────────────
interface BldgDef { cols: number; minStories: number; maxStories: number; ground: GroundEl[] }
const BLDG_DEFS: Record<string, BldgDef[]> = {
    "Shop": [
        { cols: 4, minStories: 2, maxStories: 5, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 1, type: "window" },
        ]},
        { cols: 5, minStories: 2, maxStories: 6, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 2, type: "window" },
        ]},
    ],
    "Clothes": [
        { cols: 5, minStories: 2, maxStories: 6, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 2, type: "window" },
        ]},
        { cols: 6, minStories: 3, maxStories: 7, ground: [
            { gx: 0, gw: 2, type: "window" }, { gx: 2, gw: 2, type: "door" }, { gx: 4, gw: 2, type: "window" },
        ]},
    ],
    "Mechanics": [
        { cols: 6, minStories: 1, maxStories: 2, ground: [
            { gx: 0, gw: 4, type: "garage" }, { gx: 4, gw: 1, type: "door" }, { gx: 5, gw: 1, type: "window" },
        ]},
        { cols: 5, minStories: 1, maxStories: 2, ground: [
            { gx: 0, gw: 3, type: "garage" }, { gx: 3, gw: 1, type: "door" }, { gx: 4, gw: 1, type: "window" },
        ]},
    ],
    "Jewelry": [
        { cols: 4, minStories: 2, maxStories: 5, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 1, type: "window" },
        ]},
        { cols: 5, minStories: 3, maxStories: 6, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 1, type: "window" },
            { gx: 2, gw: 2, type: "door" }, { gx: 4, gw: 1, type: "window" },
        ]},
    ],
    "Salon": [
        { cols: 4, minStories: 2, maxStories: 4, ground: [
            { gx: 0, gw: 2, type: "window" }, { gx: 2, gw: 1, type: "door" }, { gx: 3, gw: 1, type: "window" },
        ]},
        { cols: 5, minStories: 2, maxStories: 5, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 1, type: "door" }, { gx: 2, gw: 3, type: "window" },
        ]},
    ],
    "Bank": [
        { cols: 6, minStories: 3, maxStories: 8, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 1, type: "window" },
            { gx: 2, gw: 2, type: "door" },
            { gx: 4, gw: 1, type: "window" }, { gx: 5, gw: 1, type: "window" },
        ]},
        { cols: 7, minStories: 4, maxStories: 10, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 1, type: "window" }, { gx: 2, gw: 1, type: "window" },
            { gx: 3, gw: 2, type: "door" },
            { gx: 5, gw: 1, type: "window" }, { gx: 6, gw: 1, type: "window" },
        ]},
    ],
    "Vegetables": [
        { cols: 5, minStories: 1, maxStories: 3, ground: [
            { gx: 0, gw: 3, type: "window" }, { gx: 3, gw: 1, type: "door" }, { gx: 4, gw: 1, type: "window" },
        ]},
        { cols: 4, minStories: 1, maxStories: 2, ground: [
            { gx: 0, gw: 2, type: "window" }, { gx: 2, gw: 1, type: "door" }, { gx: 3, gw: 1, type: "window" },
        ]},
    ],
    "Hotel": [
        { cols: 6, minStories: 5, maxStories: 10, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" },
            { gx: 3, gw: 1, type: "window" }, { gx: 4, gw: 2, type: "window" },
        ]},
        { cols: 7, minStories: 6, maxStories: 10, ground: [
            { gx: 0, gw: 2, type: "window" }, { gx: 2, gw: 2, type: "door" },
            { gx: 4, gw: 1, type: "window" }, { gx: 5, gw: 2, type: "window" },
        ]},
    ],
    "Bar": [
        { cols: 6, minStories: 2, maxStories: 5, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 3, type: "window" },
        ]},
        { cols: 5, minStories: 2, maxStories: 4, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "door" }, { gx: 3, gw: 2, type: "window" },
        ]},
    ],
    "Crypto Exchange": [
        { cols: 5, minStories: 2, maxStories: 6, ground: [
            { gx: 0, gw: 2, type: "window" }, { gx: 2, gw: 2, type: "door" }, { gx: 4, gw: 1, type: "window" },
        ]},
        { cols: 6, minStories: 3, maxStories: 7, ground: [
            { gx: 0, gw: 1, type: "window" }, { gx: 1, gw: 2, type: "window" },
            { gx: 3, gw: 2, type: "door" }, { gx: 5, gw: 1, type: "window" },
        ]},
    ],
};

// ─── rooftop speech content ─────────────────────────────────────────
const ROOF_EXCHANGES = [
    ["Did you buy $FG?", "Yeah, loaded up!"],
    ["BTC hitting 100k?", "Easily by EOY"],
    ["Sell or hold?", "HODL forever"],
    ["$FARTGIRL mooning", "I'm up 500%"],
    ["Wen lambo?", "After next pump"],
    ["ETH merge was huge", "So bullish"],
    ["Buy the dip!", "Already did fam"],
    ["NFTs dead?", "Nah, just resting"],
    ["Check this chart", "Parabolic!"],
    ["Gas fees tho...", "Use Solana bro"],
    ["Airdrop season", "Free money!"],
    ["Rugged again?", "DYOR next time"],
    ["New ATH today!", "LFG!!!"],
    ["Paper hands sold", "Their loss"],
    ["Whale alert!", "They're accumulating"],
    ["DeFi yields?", "Still juicy"],
    ["Meme coins > all", "100x or bust"],
    ["FartGirl > Doge", "No debate"],
    ["Staking rewards?", "Passive income"],
    ["Bear market over", "Bull run incoming"],
];
const ROOF_SPEECHES = [
    "To the moon!", "$FG is the way", "WAGMI", "Diamond hands only",
    "Buy $FARTGIRL", "Bullish af", "LFG!!!", "HODL gang",
    "We're early", "1000x potential", "NGMI if you sell", "Ape in now",
    "Degen mode ON", "Trust the process", "Number go up", "Generational wealth",
    "Exit liquidity? Nah", "The flippening", "Stack sats", "Green candles only",
];

// Billboard size options (widthCells : heightFloors)
const BB_SIZES: BillboardSizeKey[] = ["2:2", "3:2", "4:2", "5:2", "3:4", "4:4", "5:4"];

// ─── types ──────────────────────────────────────────────────────────
interface UpperWin { gx: number; gw: number; floor: number; lit: boolean; color: string; flk: number }
interface FloorData { hasChadHere: boolean; chadShilled: boolean; chadWinIdx: number; coinRef: FGCoin | null; coinWinIdx: number }
interface RoofPerson { lx: number; frame: number; bodyColor: string; hatColor: string | null; pantsColor: string }
interface RoofGroup {
    people: RoofPerson[];
    speechType: "exchange" | "speech";
    speechIdx: number;
    timer: number;
    showBubble: boolean;
    bubbleLine: number;
}
interface BldgBillboard { floor: number; gx: number; gw: number; gh: number; sizeKey: BillboardSizeKey; frameIdx: number; interval: number }
interface RoofDetail { lx: number; type: "box" | "ac" | "antenna" | "vent" | "pipe" }
interface ShopProp { lx: number; type: string }
interface AlleySmoker { x: number; dir: number; frame: number }
interface BgBldg { x: number; w: number; h: number; shade: number }
interface Bldg {
    x: number; cols: number; stories: number;
    color: string; typeIdx: number;
    ground: GroundEl[];
    upperWins: UpperWin[];
    billboards: BldgBillboard[];
    floors: FloorData[];
    roofGroups: RoofGroup[];
    roofDetails: RoofDetail[];
    shopProps: ShopProp[];
    hasRoofChad: boolean; roofChadShilled: boolean;
    alley: boolean; alleyW: number;
}
interface SLight { x: number; broken: boolean; flickerPhase: number }
interface NPC {
    x: number; dir: number; spd: number; body: string; hat: string | null;
    f: number; targetX: number; paused: number;
}
interface Trail { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
interface FGCoin { type: 'outside' | 'inside' | 'roof'; x: number; bldgIdx: number; floorIdx: number; collected: boolean; bobOffset: number }
type VehicleType = "car" | "van" | "truck" | "bus" | "motorbike" | "scooter";
interface Vehicle { x: number; lane: number; spd: number; type: VehicleType; color: string; accentColor: string; frame: number }

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function rnd(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }
function rndI(lo: number, hi: number) { return Math.floor(rnd(lo, hi + 1)); }

// ─── gas border particle ────────────────────────────────────────────
interface GasP { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; max: number; color: string }
const GAS_COLORS = ["0,255,60", "80,255,80", "0,200,40", "180,255,0", "120,255,50"];

export default function FartGirlGame() {
    const ref = useRef<HTMLCanvasElement>(null);
    const gasRef = useRef<HTMLCanvasElement>(null);

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
                if (elevatorOpen) { elevatorOpen = false; }
                else if (currentFloor > 0) currentFloor--;
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

        // ── random window pattern for an upper floor ──
        function genFloorPattern(cols: number): number[] {
            const out: number[] = [];
            let rem = cols;
            while (rem > 0) {
                const mx = Math.min(3, rem);
                const w = rem <= 2 ? rem : rndI(1, mx);
                out.push(w);
                rem -= w;
            }
            return out;
        }

        // ── generate world ──
        const WORLD = 8000;
        const MAX_BLDGS = 50;
        const bldgs: Bldg[] = [];
        const slights: SLight[] = [];
        let bx = 60;

        while (bx < WORLD - 60 && bldgs.length < MAX_BLDGS) {
            const typeIdx = rndI(0, BLDG_TYPES.length - 1);
            const typeName = BLDG_TYPES[typeIdx].name;
            const defs = BLDG_DEFS[typeName];
            const def = pick(defs);
            const cols = def.cols;
            const stories = rndI(def.minStories, def.maxStories);
            const color = pick(BLDG_COLORS);
            const ground = def.ground.map(g => ({ ...g }));

            // billboards first — claim cell space before windows
            const billboards: BldgBillboard[] = [];
            const bbCellsGen = new Set<string>();
            if (stories >= 3 && Math.random() > 0.45) {
                const validSizes = BB_SIZES.filter(sk => {
                    const [sw, sh] = sk.split(":").map(Number);
                    return sw <= cols - 1 && sh / 2 <= stories - 2;
                });
                if (validSizes.length > 0) {
                    const sizeKey = pick(validSizes);
                    const [bbw, bbhFloors] = sizeKey.split(":").map(Number);
                    const bbgh = bbhFloors / 2;
                    const bbGx = rndI(0, cols - bbw);
                    const bbFloor = rndI(2, Math.max(2, stories - bbgh));
                    billboards.push({
                        floor: bbFloor, gx: bbGx, gw: bbw, gh: bbgh,
                        sizeKey, frameIdx: rndI(0, 19),
                        interval: rndI(180, 360),
                    });
                    for (let fi = bbFloor; fi < bbFloor + bbgh; fi++) {
                        for (let ci = bbGx; ci < bbGx + bbw; ci++) {
                            bbCellsGen.add(`${fi},${ci}`);
                        }
                    }
                }
            }

            // upper floor windows — skip cells occupied by billboards
            const upperWins: UpperWin[] = [];
            for (let f = 1; f < stories; f++) {
                const pattern = genFloorPattern(cols);
                let gx = 0;
                for (const pw of pattern) {
                    let covered = false;
                    for (let ci = gx; ci < gx + pw; ci++) {
                        if (bbCellsGen.has(`${f},${ci}`)) { covered = true; break; }
                    }
                    if (!covered) {
                        upperWins.push({
                            gx, gw: pw, floor: f,
                            lit: Math.random() > 0.3,
                            color: pick(WIN_LIT),
                            flk: Math.random() * 1000,
                        });
                    }
                    gx += pw;
                }
            }

            const floors: FloorData[] = [];
            for (let f = 0; f < stories; f++) floors.push({ hasChadHere: false, chadShilled: false, chadWinIdx: -1, coinRef: null, coinWinIdx: -1 });

            // rooftop groups
            const ROOF_BODY_COLORS = ["rgba(60,60,80,0.9)", "rgba(80,50,50,0.9)", "rgba(50,70,60,0.9)", "rgba(70,60,80,0.9)", "rgba(55,55,70,0.9)", "rgba(80,70,50,0.9)", "rgba(50,60,80,0.9)"];
            const ROOF_HAT_COLORS: (string | null)[] = ["#c44", "#48c", "#ca0", "#7a7", "#a68", null, null, null];
            const ROOF_PANTS_COLORS = ["rgba(40,40,55,0.9)", "rgba(55,35,35,0.9)", "rgba(35,50,45,0.9)", "rgba(50,40,60,0.9)", "rgba(30,30,50,0.9)"];
            const roofGroups: RoofGroup[] = [];
            if (stories >= 2 && Math.random() > 0.6) {
                const nGroups = rndI(1, Math.min(2, Math.floor(cols / 2)));
                const rw = bldgW(cols);
                for (let g = 0; g < nGroups; g++) {
                    const nPeople = rndI(1, 2);
                    const people: RoofPerson[] = [];
                    const baseX = (g + 0.5) * (rw / nGroups);
                    for (let p = 0; p < nPeople; p++) {
                        people.push({
                            lx: baseX + (p - (nPeople - 1) / 2) * 12,
                            frame: rnd(0, 1000),
                            bodyColor: pick(ROOF_BODY_COLORS),
                            hatColor: pick(ROOF_HAT_COLORS),
                            pantsColor: pick(ROOF_PANTS_COLORS),
                        });
                    }
                    const isExchange = nPeople >= 2 && Math.random() > 0.4;
                    roofGroups.push({
                        people,
                        speechType: isExchange ? "exchange" : "speech",
                        speechIdx: isExchange ? rndI(0, ROOF_EXCHANGES.length - 1) : rndI(0, ROOF_SPEECHES.length - 1),
                        timer: rndI(0, 300), showBubble: false, bubbleLine: 0,
                    });
                }
            }

            // roof details (boxes, AC units, vents, antennas, pipes)
            const roofDetails: RoofDetail[] = [];
            if (stories >= 2) {
                const rw = bldgW(cols);
                const detailTypes: RoofDetail["type"][] = ["box", "ac", "antenna", "vent", "pipe"];
                const nDetails = rndI(1, Math.min(4, Math.floor(cols / 2)));
                for (let d = 0; d < nDetails; d++) {
                    roofDetails.push({
                        lx: rnd(8, rw - 8),
                        type: pick(detailTypes),
                    });
                }
            }

            // outside shop decorative props
            const SHOP_PROPS: Record<string, string[]> = {
                "Clothing": ["mannequin", "sign"],
                "Bank": ["atm", "planter"],
                "Vehicles": ["cone", "tire"],
                "Electronics": ["sign", "satellite"],
                "Jewelry": ["planter", "lamp"],
                "Vegetables": ["crate", "barrel"],
                "Hotel": ["planter", "lamp"],
                "Bar": ["barrel", "sign"],
                "Crypto Exchange": ["sign", "satellite"],
                "Pharmacy": ["sign", "planter"],
            };
            const shopProps: ShopProp[] = [];
            const propTypes = SHOP_PROPS[typeName] || ["sign"];
            const nProps = rndI(1, 2);
            const rw = bldgW(cols);
            for (let pi = 0; pi < nProps; pi++) {
                shopProps.push({
                    lx: rnd(6, rw - 6),
                    type: propTypes[pi % propTypes.length],
                });
            }

            const alley = Math.random() > 0.5;
            const alleyW = alley ? rndI(10, 24) : 0;

            bldgs.push({
                x: bx, cols, stories, color, typeIdx,
                ground, upperWins, billboards, floors,
                roofGroups, roofDetails, shopProps,
                hasRoofChad: false, roofChadShilled: false,
                alley, alleyW,
            });

            bx += bldgW(cols) + alleyW + rndI(4, 12);
            if (Math.random() > 0.35) slights.push({ x: bx - alleyW / 2 - 2, broken: Math.random() > 0.75, flickerPhase: rnd(0, 1000) });
        }

        // assign 8 chads to random building+floor combos (max 1 per floor)
        let investorCount = 0;
        const TOTAL_CHADS = 8;
        const totalChads = Math.min(TOTAL_CHADS, bldgs.length);
        const chadSlots: { bi: number; fi: number }[] = [];
        for (let bi = 0; bi < bldgs.length; bi++) {
            const b = bldgs[bi];
            for (let fi = 0; fi < b.stories; fi++) chadSlots.push({ bi, fi });
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
            // pick a specific window index on that floor for flickering
            const winsOnFloor = bldgs[slot.bi].upperWins.filter(w => w.floor === slot.fi);
            if (winsOnFloor.length > 0) {
                const pickedWin = winsOnFloor[Math.floor(Math.random() * winsOnFloor.length)];
                const winIdx = bldgs[slot.bi].upperWins.indexOf(pickedWin);
                bldgs[slot.bi].floors[slot.fi].chadWinIdx = winIdx;
            }
            chadCount++;
        }

        // ── alley smokers ──
        const alleySmokers: AlleySmoker[] = [];
        for (const b of bldgs) {
            if (b.alley && b.alleyW >= 14 && Math.random() > 0.35) {
                const smokerX = b.x + bldgW(b.cols) + b.alleyW * 0.5;
                alleySmokers.push({ x: smokerX, dir: Math.random() > 0.5 ? 1 : -1, frame: rnd(0, 1000) });
            }
        }

        // ── FG coins (8 total: 4 outside, 2 inside buildings, 2 on rooftops) ──
        let coinCount = 0;
        const TOTAL_COINS = 8;
        const fgCoins: FGCoin[] = [];
        // 4 outside coins spread across the world
        for (let ci2 = 0; ci2 < 4; ci2++) {
            fgCoins.push({
                type: 'outside',
                x: 200 + ci2 * (WORLD / 4) + rnd(-80, 80),
                bldgIdx: -1,
                floorIdx: -1,
                collected: false,
                bobOffset: rnd(0, Math.PI * 2),
            });
        }
        // 2 inside + 2 roof coins assigned to random buildings
        const coinBldgPool = bldgs.map((_, i) => i);
        for (let ci3 = coinBldgPool.length - 1; ci3 > 0; ci3--) {
            const cj = Math.floor(Math.random() * (ci3 + 1));
            [coinBldgPool[ci3], coinBldgPool[cj]] = [coinBldgPool[cj], coinBldgPool[ci3]];
        }
        let insideCoinsDone = 0, roofCoinsDone = 0;
        for (const cbi of coinBldgPool) {
            if (insideCoinsDone >= 2 && roofCoinsDone >= 2) break;
            const cb = bldgs[cbi];
            if (insideCoinsDone < 2 && cb.stories > 1) {
                const cfi = Math.floor(Math.random() * cb.stories);
                const coinRX = rnd(45, 145);
                const coin: FGCoin = { type: 'inside', x: coinRX, bldgIdx: cbi, floorIdx: cfi, collected: false, bobOffset: rnd(0, Math.PI * 2) };
                // assign a window on that floor to flicker gold
                const winsOnCoinFloor = cb.upperWins.filter(cw => cw.floor === cfi);
                if (winsOnCoinFloor.length > 0) {
                    const pickedCW = winsOnCoinFloor[Math.floor(Math.random() * winsOnCoinFloor.length)];
                    cb.floors[cfi].coinWinIdx = cb.upperWins.indexOf(pickedCW);
                }
                cb.floors[cfi].coinRef = coin;
                fgCoins.push(coin);
                insideCoinsDone++;
            } else if (roofCoinsDone < 2 && cb.stories >= 3) {
                const coinRX = rnd(45, 145);
                const coin: FGCoin = { type: 'roof', x: coinRX, bldgIdx: cbi, floorIdx: -1, collected: false, bobOffset: rnd(0, Math.PI * 2) };
                fgCoins.push(coin);
                roofCoinsDone++;
            }
        }

        // ── vehicles on road ──
        const VEHICLE_COLORS = ["#c0392b","#2980b9","#27ae60","#8e44ad","#e67e22","#2c3e50","#f39c12","#16a085","#e74c3c","#3498db"];
        const ACCENT_COLORS = ["#ecf0f1","#bdc3c7","#f1c40f","#1abc9c","#e74c3c"];
        const VTYPES: VehicleType[] = ["car","car","car","van","van","truck","bus","motorbike","motorbike","scooter"];
        const vehicles: Vehicle[] = [];
        for (let vi = 0; vi < 20; vi++) {
            const type = VTYPES[vi % VTYPES.length];
            const lane = vi % 2; // 0=upper lane L->R, 1=lower lane R->L
            const baseSpd = type === "bus" || type === "truck" ? rnd(1.2, 2.2) :
                            type === "motorbike" || type === "scooter" ? rnd(2.5, 4.0) :
                            rnd(1.5, 3.0);
            vehicles.push({
                x: rnd(0, WORLD),
                lane,
                spd: baseSpd * (lane === 0 ? 1 : -1),
                type,
                color: pick(VEHICLE_COLORS),
                accentColor: pick(ACCENT_COLORS),
                frame: rnd(0, 100),
            });
        }

        // ── parallax background city ──
        const bgBldgs: BgBldg[] = [];
        for (let bgx = -200; bgx < WORLD * 1.3; bgx += rndI(25, 60)) {
            bgBldgs.push({ x: bgx, w: rndI(20, 50), h: rndI(50, 200), shade: rnd(0.06, 0.15) });
        }
        // mid-ground parallax layer (closer, drawn in front of far layer)
        const bgBldgs2: BgBldg[] = [];
        for (let bgx2 = -100; bgx2 < WORLD * 1.15; bgx2 += rndI(16, 40)) {
            bgBldgs2.push({ x: bgx2, w: rndI(12, 32), h: rndI(28, 110), shade: rnd(0.15, 0.28) });
        }
        // near-ground parallax layer (right behind foreground buildings)
        const bgBldgs3: BgBldg[] = [];
        for (let bgx3 = -80; bgx3 < WORLD * 1.08; bgx3 += rndI(10, 28)) {
            bgBldgs3.push({ x: bgx3, w: rndI(8, 22), h: rndI(18, 70), shade: rnd(0.30, 0.50) });
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
        let nearElevator = false;
        let elevatorOpen = false; // showing elevator floor panel
        let pitchAnim = 0;
        let actionPressed = false;
        let needsHairReset = true;
        let transitionFade = 1;
        let allSecuredShowUntil = -1;

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
            const hY_early = py - 14 * s + bob - 2.5 * s;
            if (needsHairReset) { resetHair(fgX, hY_early); needsHairReset = false; }
            if (transitionFade < 1) { transitionFade = Math.min(1, transitionFade + 0.07); }
            c.save(); c.globalAlpha = transitionFade;
            if (fgMoving && tick % 4 === 0 && insideBldgIdx < 0)
                trail.push({ x: fgX - fgDir * 6, y: py - 5 + rnd(-3, 3), vx: -fgDir * rnd(0.2, 0.8), vy: rnd(-0.5, -0.1), life: 0, max: rnd(25, 50), r: rnd(1.5, 3.5) });
            const ls = fgMoving ? Math.sin(fgFrame * 0.30) * 2.5 * s : 0;
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
            c.restore();
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
            const pw = bldgW(b.cols), ph = bldgH(b.stories);
            const bsx = b.x - camX;
            if (bsx + pw < -10 || bsx > w + 10) return;
            const c = ctx!;
            const by = groundY - ph;

            // body
            c.fillStyle = b.color;
            c.fillRect(bsx, by, pw, ph);
            c.fillStyle = "rgba(120,140,180,0.12)";
            c.fillRect(bsx, by, pw, 1);
            c.fillStyle = "rgba(180,200,240,0.06)";
            c.fillRect(bsx, by, 1, ph);
            c.fillRect(bsx + pw - 1, by, 1, ph);

            // subtle grid lines
            c.fillStyle = "rgba(100,110,140,0.06)";
            for (let col = 1; col < b.cols; col++) {
                c.fillRect(bsx + col * STEP, by + GAP, GAP, ph - GAP);
            }
            for (let row = 1; row < b.stories * FLOOR_H; row++) {
                c.fillRect(bsx + GAP, by + row * STEP, pw - 2 * GAP, GAP);
            }

            // ground floor
            const gfY = by + floorLY(b.stories, 0);
            const gfH = span(FLOOR_H);
            const gfData = b.floors[0];
            for (const el of b.ground) {
                const ex = bsx + cellLX(el.gx);
                const ew = span(el.gw);
                if (el.type === "door") {
                    c.fillStyle = "rgba(8,8,16,0.95)";
                    c.fillRect(ex, gfY, ew, gfH);
                    c.strokeStyle = "rgba(100,100,140,0.3)";
                    c.lineWidth = 0.5;
                    c.strokeRect(ex, gfY, ew, gfH);
                    if (el.gw >= 2) {
                        c.fillStyle = "rgba(60,60,80,0.3)";
                        c.fillRect(ex + ew / 2 - 0.5, gfY, 1, gfH);
                    }
                    c.fillStyle = "rgba(200,180,100,0.5)";
                    c.beginPath();
                    c.arc(ex + ew - 4, gfY + gfH * 0.55, 1.2, 0, Math.PI * 2);
                    c.fill();
                    c.fillStyle = "rgba(255,200,100,0.25)";
                    c.fillRect(ex + 1, gfY - 2, ew - 2, 2);
                } else if (el.type === "window") {
                    c.fillStyle = "rgba(5,5,14,0.9)";
                    c.fillRect(ex, gfY, ew, gfH);
                    if (gfData.hasChadHere && !gfData.chadShilled) {
                        const pulse = 0.3 + Math.sin(tick * 0.05) * 0.2;
                        c.fillStyle = `rgba(34,197,94,${pulse})`;
                        c.fillRect(ex + 1, gfY + 1, ew - 2, gfH - 2);
                    } else if (gfData.chadShilled) {
                        const pulse = 0.55 + Math.sin(tick * 0.03) * 0.3;
                        c.fillStyle = `rgba(34,197,94,${pulse})`;
                        c.fillRect(ex + 1, gfY + 1, ew - 2, gfH - 2);
                    } else {
                        c.fillStyle = "rgba(200,180,120,0.08)";
                        c.fillRect(ex + 1, gfY + 1, ew - 2, gfH - 2);
                    }
                    c.strokeStyle = "rgba(150,140,100,0.3)";
                    c.lineWidth = 0.5;
                    c.strokeRect(ex, gfY, ew, gfH);
                } else if (el.type === "garage") {
                    c.fillStyle = "rgba(10,10,18,0.92)";
                    c.fillRect(ex, gfY, ew, gfH);
                    c.strokeStyle = "rgba(80,80,100,0.3)";
                    c.lineWidth = 0.5;
                    c.strokeRect(ex, gfY, ew, gfH);
                    for (let li = 1; li < 4; li++) {
                        const ly = gfY + li * (gfH / 4);
                        c.beginPath();
                        c.moveTo(ex + 1, ly);
                        c.lineTo(ex + ew - 1, ly);
                        c.stroke();
                    }
                    const carW = Math.min(ew * 0.7, 40);
                    const carH = gfH * 0.45;
                    const carX = ex + (ew - carW) / 2;
                    const carY = gfY + gfH - carH - 3;
                    c.fillStyle = "rgba(60,50,70,0.6)";
                    c.fillRect(carX, carY + carH * 0.3, carW, carH * 0.7);
                    c.fillRect(carX + carW * 0.15, carY, carW * 0.7, carH * 0.5);
                    c.fillStyle = "rgba(30,30,40,0.8)";
                    c.beginPath();
                    c.arc(carX + carW * 0.22, carY + carH, 3, 0, Math.PI * 2);
                    c.arc(carX + carW * 0.78, carY + carH, 3, 0, Math.PI * 2);
                    c.fill();
                    c.fillStyle = "rgba(100,120,160,0.3)";
                    c.fillRect(carX + carW * 0.2, carY + 1, carW * 0.6, carH * 0.35);
                }
            }

            // billboard occupied cells
            const bbCells = new Set<string>();
            for (const bb of b.billboards) {
                for (let fi = bb.floor; fi < bb.floor + bb.gh; fi++) {
                    for (let ci = bb.gx; ci < bb.gx + bb.gw; ci++) {
                        bbCells.add(`${fi},${ci}`);
                    }
                }
            }

            // upper floor windows
            for (let wi = 0; wi < b.upperWins.length; wi++) {
                const win = b.upperWins[wi];
                let covered = false;
                for (let ci = win.gx; ci < win.gx + win.gw; ci++) {
                    if (bbCells.has(`${win.floor},${ci}`)) { covered = true; break; }
                }
                if (covered) continue;
                const wx = bsx + cellLX(win.gx);
                const wy = by + floorLY(b.stories, win.floor);
                const ww = span(win.gw);
                const wh = span(FLOOR_H);
                // floors[] is 0-indexed by story, upperWins.floor is 1-indexed from bottom
                const fd = b.floors[win.floor]; // win.floor matches floors[] index directly
                const isChadWin = fd && fd.hasChadHere && fd.chadWinIdx === wi;
                const isCoinWin = !!(fd?.coinRef) && !fd.coinRef!.collected && fd.coinWinIdx === wi;

                c.fillStyle = "rgba(5,5,14,0.9)";
                c.fillRect(wx, wy, ww, wh);
                if (isChadWin && !fd.chadShilled) {
                    // erratic fast flicker on the ONE designated window
                    const flkRate = 0.18 + Math.sin(tick * 0.31) * 0.12;
                    const flkNoise = Math.sin(tick * flkRate + win.flk) * Math.sin(tick * 0.47 + win.flk * 1.3);
                    const pulse = 0.2 + Math.max(0, flkNoise) * 0.8;
                    c.fillStyle = `rgba(34,197,94,${pulse})`;
                    c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    // bright flash every few frames
                    if (tick % 5 < 1) {
                        c.fillStyle = `rgba(134,255,134,0.5)`;
                        c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    }
                } else if (fd && fd.chadShilled) {
                    // steady green — chad shilled, solid glow
                    const pulse = 0.55 + Math.sin((tick + win.flk) * 0.03) * 0.3;
                    c.fillStyle = `rgba(34,197,94,${pulse})`;
                    c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                } else if (isCoinWin) {
                    // erratic gold flicker — $FG coin inside
                    const flkRate2 = 0.18 + Math.sin(tick * 0.29) * 0.11;
                    const flkNoise2 = Math.sin(tick * flkRate2 + win.flk) * Math.sin(tick * 0.51 + win.flk * 1.2);
                    const pulse2 = 0.2 + Math.max(0, flkNoise2) * 0.8;
                    c.fillStyle = `rgba(251,191,36,${pulse2})`;
                    c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    if (tick % 5 < 1) {
                        c.fillStyle = `rgba(255,236,100,0.5)`;
                        c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    }
                } else if (win.lit) {
                    const br = 0.6 + Math.sin((tick + win.flk) * 0.02) * 0.15;
                    c.globalAlpha = br;
                    c.fillStyle = win.color;
                    c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                    c.fillStyle = "#fff";
                    c.globalAlpha = br * 0.15;
                    c.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
                    c.globalAlpha = 1;
                } else {
                    c.fillStyle = "rgba(18,18,28,0.85)";
                    c.fillRect(wx + 1, wy + 1, ww - 2, wh - 2);
                }
            }

            // billboards with animated pixel art
            for (const bb of b.billboards) {
                const bbx = bsx + cellLX(bb.gx);
                const topFloor = bb.floor + bb.gh - 1;
                const bby = by + floorLY(b.stories, topFloor);
                const bbpw = span(bb.gw);
                const bbph = bb.gh * FLOOR_H * STEP - GAP;
                c.fillStyle = "#06060e";
                c.fillRect(bbx, bby, bbpw, bbph);
                c.strokeStyle = "rgba(160,170,200,0.5)";
                c.lineWidth = 1.5;
                c.strokeRect(bbx, bby, bbpw, bbph);
                // light fixture
                c.fillStyle = "rgba(200,200,220,0.8)";
                c.fillRect(bbx + bbpw * 0.15, bby - 3, bbpw * 0.7, 3);
                // volumetric cone
                c.save();
                c.globalCompositeOperation = "lighter";
                const lg = c.createLinearGradient(bbx, bby, bbx, bby + bbph);
                lg.addColorStop(0, "rgba(255,255,240,0.12)");
                lg.addColorStop(1, "rgba(255,255,240,0)");
                c.fillStyle = lg;
                c.fillRect(bbx, bby, bbpw, bbph);
                c.restore();
                // animated pixel art from billboard-art.ts
                const frames = BILLBOARD_ART[bb.sizeKey];
                const artIdx = Math.floor(tick / bb.interval) % frames.length;
                const art = frames[artIdx];
                // Use square pixels to prevent stretching (coins look like eggs otherwise)
                const pxWRaw = (bbpw - 8) / art.w;
                const pxHRaw = (bbph - 8) / art.h;
                const pxSz = Math.min(pxWRaw, pxHRaw);
                const artTotalW = pxSz * art.w;
                const artTotalH = pxSz * art.h;
                const artOffX = bbx + 4 + ((bbpw - 8) - artTotalW) / 2;
                const artOffY = bby + 4 + ((bbph - 8) - artTotalH) / 2;
                for (let py = 0; py < art.h; py++) {
                    for (let px = 0; px < art.w; px++) {
                        const v = art.data[py * art.w + px];
                        if (v === 0) continue;
                        c.fillStyle = art.palette[v];
                        c.fillRect(artOffX + px * pxSz, artOffY + py * pxSz, pxSz, pxSz);
                    }
                }
            }

            // building name strip — half-cell strip above door (grid exception)
            const typeName = BLDG_TYPES[b.typeIdx].name.toUpperCase();
            const stripH = Math.floor(CELL / 2);
            const stripY = b.stories > 1
                ? by + floorLY(b.stories, 0) - stripH
                : by - stripH;
            c.fillStyle = "rgba(0,0,0,0.82)";
            c.fillRect(bsx, stripY, pw, stripH);
            c.fillStyle = "rgba(120,110,90,0.25)";
            c.fillRect(bsx, stripY, pw, 1);
            c.fillRect(bsx, stripY + stripH - 1, pw, 1);
            c.fillStyle = "#e0d8c0";
            c.font = "bold 7px sans-serif";
            c.textAlign = "center";
            c.fillText(typeName, bsx + pw / 2, stripY + stripH / 2 + 2.5);

            // rooftop
            c.fillStyle = "rgba(140,150,180,0.25)";
            c.fillRect(bsx, by, pw, 2);
            c.fillRect(bsx, by, 2, 6);
            c.fillRect(bsx + pw - 2, by, 2, 6);

            // roof details (boxes, ac units, vents, antennas, pipes)
            for (const rd of b.roofDetails) {
                const rdx = bsx + rd.lx;
                const rdy = by;
                if (rd.type === "box") {
                    c.fillStyle = "rgba(80,75,70,0.7)";
                    c.fillRect(rdx - 4, rdy - 5, 8, 5);
                    c.fillStyle = "rgba(100,95,90,0.5)";
                    c.fillRect(rdx - 4, rdy - 5, 8, 1);
                } else if (rd.type === "ac") {
                    c.fillStyle = "rgba(100,110,120,0.7)";
                    c.fillRect(rdx - 5, rdy - 7, 10, 7);
                    c.fillStyle = "rgba(60,70,80,0.5)";
                    c.fillRect(rdx - 4, rdy - 6, 8, 2);
                    c.fillRect(rdx - 4, rdy - 3, 8, 2);
                } else if (rd.type === "antenna") {
                    c.strokeStyle = "rgba(150,150,170,0.6)";
                    c.lineWidth = 1;
                    c.beginPath();
                    c.moveTo(rdx, rdy);
                    c.lineTo(rdx, rdy - 14);
                    c.stroke();
                    c.fillStyle = "rgba(255,80,80,0.7)";
                    c.beginPath(); c.arc(rdx, rdy - 14, 1.2, 0, Math.PI * 2); c.fill();
                } else if (rd.type === "vent") {
                    c.fillStyle = "rgba(90,90,100,0.6)";
                    c.beginPath(); c.arc(rdx, rdy - 3, 3, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "rgba(40,40,50,0.8)";
                    c.beginPath(); c.arc(rdx, rdy - 3, 1.5, 0, Math.PI * 2); c.fill();
                } else if (rd.type === "pipe") {
                    c.fillStyle = "rgba(110,110,120,0.6)";
                    c.fillRect(rdx - 1, rdy - 10, 2, 10);
                    c.fillRect(rdx - 3, rdy - 10, 6, 2);
                }
            }

            // roof access door structure
            if (b.stories >= 3) {
                const accessX = bsx + pw - 18;
                c.fillStyle = "rgba(70,65,60,0.7)";
                c.fillRect(accessX, by - 14, 12, 14);
                c.fillStyle = "rgba(30,30,40,0.9)";
                c.fillRect(accessX + 3, by - 10, 6, 10);
            }

            for (const grp of b.roofGroups) {
                grp.timer++;
                if (grp.timer > 180 && !grp.showBubble) {
                    grp.showBubble = true;
                    grp.bubbleLine = 0;
                    grp.timer = 0;
                }
                if (grp.showBubble && grp.timer > 120) {
                    if (grp.speechType === "exchange" && grp.bubbleLine === 0) {
                        grp.bubbleLine = 1;
                        grp.timer = 0;
                    } else {
                        grp.showBubble = false;
                        grp.timer = 0;
                        grp.speechIdx = grp.speechType === "exchange"
                            ? rndI(0, ROOF_EXCHANGES.length - 1)
                            : rndI(0, ROOF_SPEECHES.length - 1);
                    }
                }
                for (const p of grp.people) {
                    const rpx = b.x + p.lx;
                    const rpy = by;
                    const rsx = rpx - camX;
                    if (rsx < -40 || rsx > w + 40) continue;
                    // standing person (no walk animation)
                    const rs = 1.0;
                    // legs/pants with varied color
                    c.fillStyle = p.pantsColor;
                    c.fillRect(rsx - 2 * rs, rpy - 6 * rs, 1.5 * rs, 6 * rs);
                    c.fillRect(rsx + 0.5 * rs, rpy - 6 * rs, 1.5 * rs, 6 * rs);
                    // body with varied color
                    c.fillStyle = p.bodyColor;
                    c.fillRect(rsx - 3 * rs, rpy - 14 * rs, 6 * rs, 8 * rs);
                    // arms at rest
                    c.strokeStyle = p.bodyColor; c.lineWidth = 1.5 * rs;
                    c.beginPath();
                    c.moveTo(rsx - 3 * rs, rpy - 12 * rs); c.lineTo(rsx - 5 * rs, rpy - 6 * rs);
                    c.moveTo(rsx + 3 * rs, rpy - 12 * rs); c.lineTo(rsx + 5 * rs, rpy - 6 * rs);
                    c.stroke();
                    // head
                    c.fillStyle = SKIN;
                    c.beginPath(); c.arc(rsx, rpy - 17 * rs, 3.5 * rs, 0, Math.PI * 2); c.fill();
                    // eyes
                    c.fillStyle = "#111";
                    c.fillRect(rsx + 0.5 * rs, rpy - 18 * rs, 1 * rs, 1 * rs);
                    c.fillRect(rsx + 2 * rs, rpy - 18 * rs, 1 * rs, 1 * rs);
                    // hat (varied)
                    if (p.hatColor) {
                        c.fillStyle = p.hatColor;
                        c.fillRect(rsx - 4.5 * rs, rpy - 21 * rs, 9 * rs, 2.5 * rs);
                        c.fillRect(rsx - 3 * rs, rpy - 23 * rs, 6 * rs, 2.5 * rs);
                    }
                    // cigarette + smoke
                    const smoking = Math.sin(p.frame + tick * 0.03) > 0.3;
                    if (smoking) {
                        c.fillStyle = "rgba(200,180,140,0.9)";
                        c.fillRect(rsx + 4 * rs, rpy - 15 * rs, 5 * rs, 1 * rs);
                        c.fillStyle = "rgba(255,120,30,0.9)";
                        c.beginPath(); c.arc(rsx + 9 * rs, rpy - 14.5 * rs, 0.8, 0, Math.PI * 2); c.fill();
                        // smoke wisps
                        const st = tick * 0.04 + p.frame;
                        c.globalAlpha = 0.25 + Math.sin(st) * 0.1;
                        c.fillStyle = "rgba(180,180,200,0.5)";
                        c.beginPath(); c.arc(rsx + 10 * rs + Math.sin(st * 1.3) * 3, rpy - 16 * rs - (tick % 60) * 0.15, 1.5, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(rsx + 11 * rs + Math.sin(st * 0.9) * 2, rpy - 18 * rs - (tick % 80) * 0.12, 2, 0, Math.PI * 2); c.fill();
                        c.globalAlpha = 1;
                    }
                }
                if (grp.showBubble && grp.people.length > 0) {
                    const speaker = grp.speechType === "exchange" && grp.bubbleLine === 1 && grp.people.length > 1
                        ? grp.people[1] : grp.people[0];
                    const sbx = bsx + speaker.lx;
                    const sby = by - 24;
                    const text = grp.speechType === "exchange"
                        ? ROOF_EXCHANGES[grp.speechIdx][grp.bubbleLine]
                        : ROOF_SPEECHES[grp.speechIdx];
                    c.font = "bold 9px sans-serif";
                    const tw = c.measureText(text).width;
                    const bw2 = tw + 14, bh2 = 18;
                    c.fillStyle = "rgba(0,0,0,0.85)";
                    c.beginPath();
                    c.roundRect(sbx - bw2 / 2, sby - bh2, bw2, bh2, 5);
                    c.fill();
                    c.strokeStyle = grp.speechType === "exchange" ? "rgba(74,222,128,0.4)" : "rgba(251,191,36,0.4)";
                    c.lineWidth = 1;
                    c.beginPath();
                    c.roundRect(sbx - bw2 / 2, sby - bh2, bw2, bh2, 5);
                    c.stroke();
                    c.beginPath();
                    c.moveTo(sbx - 3, sby);
                    c.lineTo(sbx + 3, sby);
                    c.lineTo(sbx, sby + 5);
                    c.closePath();
                    c.fillStyle = "rgba(0,0,0,0.85)";
                    c.fill();
                    c.fillStyle = grp.speechType === "exchange" ? "#4ade80" : "#fbbf24";
                    c.textAlign = "center";
                    c.fillText(text, sbx, sby - 5);
                }
            }

            // alley
            if (b.alley) {
                c.fillStyle = "rgba(0,0,0,0.5)";
                c.fillRect(bsx + pw, groundY - Math.min(ph, 80), b.alleyW, Math.min(ph, 80));
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

            let fl: number;
            if (sl.broken) {
                // broken: rapid erratic flicker, sometimes off
                const t = tick * 0.15 + sl.flickerPhase;
                const noise = Math.sin(t * 3.7) * Math.sin(t * 7.3) * Math.sin(t * 1.1);
                fl = noise > 0.1 ? (0.4 + noise * 0.6) : 0;
                if (fl > 0 && Math.random() > 0.92) fl = 0; // random dropout
            } else {
                fl = 0.85 + Math.sin(tick * 0.05 + sl.x * 0.1) * 0.1;
            }

            if (fl > 0.01) {
                // radial glow from bulb — non-broken lights glow more
                const glowBoost = sl.broken ? 1.0 : 2.2;
                const g = c.createRadialGradient(sx, groundY - pH + 3, 0, sx, groundY - pH + 3, 55);
                g.addColorStop(0, `rgba(255,220,130,${Math.min(1, 0.25 * fl * glowBoost)})`);
                g.addColorStop(0.5, `rgba(255,220,130,${Math.min(1, 0.1 * fl * glowBoost)})`);
                g.addColorStop(1, "rgba(255,220,130,0)");
                c.fillStyle = g;
                c.beginPath(); c.arc(sx, groundY - pH + 3, 55, 0, Math.PI * 2); c.fill();
                // ground pool
                const gp = c.createRadialGradient(sx, groundY, 0, sx, groundY, 40);
                gp.addColorStop(0, `rgba(255,220,130,${Math.min(1, 0.08 * fl * glowBoost)})`);
                gp.addColorStop(1, "rgba(255,220,130,0)");
                c.fillStyle = gp;
                c.fillRect(sx - 40, groundY - 5, 80, 10);
                // bulb
                c.fillStyle = `rgba(255,240,180,${0.9 * fl})`;
                c.beginPath(); c.arc(sx, groundY - pH + 3, 2.5, 0, Math.PI * 2); c.fill();
            } else {
                // dead bulb
                c.fillStyle = "rgba(60,60,70,0.4)";
                c.beginPath(); c.arc(sx, groundY - pH + 3, 2, 0, Math.PI * 2); c.fill();
            }
        }

        // ── draw: parallax background city ──
        function drawBgCity() {
            const c = ctx!;
            const parallax = 0.3;
            const offX = camX * parallax;
            for (const bg of bgBldgs) {
                const sx = bg.x - offX;
                if (sx + bg.w < -10 || sx > w + 10) continue;
                c.fillStyle = `rgba(18,18,35,${bg.shade})`;
                c.fillRect(sx, groundY - bg.h, bg.w, bg.h);
                c.fillStyle = `rgba(40,40,70,${bg.shade * 0.5})`;
                c.fillRect(sx, groundY - bg.h, bg.w, 1);
                c.fillRect(sx, groundY - bg.h, 1, bg.h);
                c.fillStyle = `rgba(255,220,130,${bg.shade * 0.5})`;
                for (let wy = groundY - bg.h + 6; wy < groundY - 4; wy += 10) {
                    for (let wx = sx + 4; wx < sx + bg.w - 4; wx += 7) {
                        if (Math.sin(wx * 3.1 + wy * 2.7) > 0.2) {
                            c.fillRect(wx, wy, 2, 3);
                        }
                    }
                }
            }
            // mid-ground layer (parallax 0.55)
            const offX2 = camX * 0.55;
            for (const bg of bgBldgs2) {
                const sx = bg.x - offX2;
                if (sx + bg.w < -10 || sx > w + 10) continue;
                c.fillStyle = `rgba(24,24,44,${bg.shade})`;
                c.fillRect(sx, groundY - bg.h, bg.w, bg.h);
                c.fillStyle = `rgba(55,55,88,${bg.shade * 0.4})`;
                c.fillRect(sx, groundY - bg.h, bg.w, 1);
                c.fillRect(sx, groundY - bg.h, 1, bg.h);
                c.fillStyle = `rgba(255,220,130,${bg.shade * 0.65})`;
                for (let wy = groundY - bg.h + 5; wy < groundY - 4; wy += 9) {
                    for (let wx = sx + 3; wx < sx + bg.w - 3; wx += 6) {
                        if (Math.sin(wx * 2.9 + wy * 3.1) > 0.15) c.fillRect(wx, wy, 2, 3);
                    }
                }
            }
            // near-ground layer (parallax 0.78, right behind foreground)
            const offX3 = camX * 0.78;
            for (const bg of bgBldgs3) {
                const sx = bg.x - offX3;
                if (sx + bg.w < -10 || sx > w + 10) continue;
                c.fillStyle = `rgba(28,28,50,${bg.shade})`;
                c.fillRect(sx, groundY - bg.h, bg.w, bg.h);
                c.fillStyle = `rgba(70,70,100,${bg.shade * 0.35})`;
                c.fillRect(sx, groundY - bg.h, bg.w, 1);
                c.fillRect(sx, groundY - bg.h, 1, bg.h);
                c.fillStyle = `rgba(255,220,130,${bg.shade * 0.8})`;
                for (let wy = groundY - bg.h + 4; wy < groundY - 4; wy += 8) {
                    for (let wx = sx + 2; wx < sx + bg.w - 2; wx += 5) {
                        if (Math.sin(wx * 3.3 + wy * 2.5) > 0.2) c.fillRect(wx, wy, 2, 3);
                    }
                }
            }
        }

        // ── draw: alley smoker ──
        function drawAlleySmoker(sm: AlleySmoker) {
            const sx = sm.x - camX, c = ctx!;
            if (sx < -30 || sx > w + 30) return;
            const py = groundY;
            const s = 0.9;
            // legs
            c.fillStyle = "rgba(40,40,55,0.8)";
            c.fillRect(sx - 1.5 * s, py - 5 * s, 1.5 * s, 5 * s);
            c.fillRect(sx + 0.5 * s, py - 5 * s, 1.5 * s, 5 * s);
            // body (leaning against wall)
            c.fillStyle = "rgba(50,45,55,0.85)";
            c.fillRect(sx - 3 * s, py - 14 * s, 6 * s, 9 * s);
            // head
            c.fillStyle = SKIN;
            c.beginPath(); c.arc(sx, py - 17 * s, 3 * s, 0, Math.PI * 2); c.fill();
            // hoodie/beanie
            c.fillStyle = "rgba(60,50,70,0.9)";
            c.beginPath(); c.arc(sx, py - 17.5 * s, 3.2 * s, Math.PI, 0); c.fill();
            // cigarette
            c.fillStyle = "rgba(220,200,160,0.9)";
            c.fillRect(sx + sm.dir * 3.5 * s, py - 15 * s, sm.dir * 5 * s, 0.8 * s);
            c.fillStyle = "rgba(255,100,20,0.9)";
            c.beginPath(); c.arc(sx + sm.dir * 8.5 * s, py - 14.6 * s, 0.7, 0, Math.PI * 2); c.fill();
            // smoke wisps
            const st = tick * 0.03 + sm.frame;
            for (let i = 0; i < 3; i++) {
                const age = (tick * 0.6 + sm.frame + i * 25) % 80;
                const smokeA = Math.max(0, 0.3 - age * 0.004);
                if (smokeA <= 0) continue;
                c.fillStyle = `rgba(160,160,180,${smokeA})`;
                c.beginPath();
                c.arc(
                    sx + sm.dir * 9 * s + Math.sin(st + i * 2.1) * (3 + age * 0.15),
                    py - 15 * s - age * 0.6,
                    1.2 + age * 0.04,
                    0, Math.PI * 2
                );
                c.fill();
            }
        }

        // ── draw: hoodie dude (chad) ──
        function drawHoodieDude(x: number, fy: number, greenPhone: boolean) {
            const c = ctx!;
            const pc = greenPhone ? "34,197,94" : "140,180,255";

            // Full 360° glow from phone FIRST (behind everything)
            const phX = x + 5, phY = fy - 16;
            c.save(); c.globalCompositeOperation = "lighter";
            const lg = c.createRadialGradient(phX, phY - 1, 0, phX, phY - 1, 35);
            lg.addColorStop(0, `rgba(${pc},0.3)`);
            lg.addColorStop(0.3, `rgba(${pc},0.15)`);
            lg.addColorStop(0.6, `rgba(${pc},0.05)`);
            lg.addColorStop(1, `rgba(${pc},0)`);
            c.fillStyle = lg;
            c.beginPath(); c.arc(phX, phY - 1, 35, 0, Math.PI * 2); c.fill();
            c.restore();

            // Legs — brighter so visible under glow
            c.fillStyle = "#2a2a40";
            c.fillRect(x - 3, fy - 5, 2.5, 5); c.fillRect(x + 0.5, fy - 5, 2.5, 5);
            // shoes
            c.fillStyle = "#222235";
            c.fillRect(x - 3.5, fy - 1, 3.5, 1); c.fillRect(x + 0.5, fy - 1, 3.5, 1);

            // Body/hoodie
            c.fillStyle = "#222240";
            c.beginPath();
            c.moveTo(x - 6, fy - 5); c.lineTo(x - 5, fy - 22); c.lineTo(x + 5, fy - 22); c.lineTo(x + 6, fy - 5);
            c.closePath(); c.fill();
            // Hood
            c.fillStyle = "#222240";
            c.beginPath(); c.arc(x, fy - 24, 6, Math.PI, 0); c.fill();
            // Dark head inside hood
            c.fillStyle = "#1a1a30";
            c.beginPath(); c.arc(x, fy - 24, 4, 0, Math.PI * 2); c.fill();
            // Face glow from phone light
            c.fillStyle = `rgba(${pc},0.12)`;
            c.beginPath(); c.arc(x + 0.5, fy - 24, 3.5, 0, Math.PI * 2); c.fill();

            // Arm holding phone (toward chad, not toward viewer)
            c.strokeStyle = "#222240"; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x + 5, fy - 20); c.lineTo(phX, phY); c.stroke();

            // Phone — back facing us (no screen visible), just the device shell
            c.fillStyle = greenPhone ? "#1a5a30" : "#2a3a5a";
            c.fillRect(phX - 1.5, phY - 3, 3, 5);
            // camera dot on back
            c.fillStyle = "rgba(80,80,100,0.6)";
            c.beginPath(); c.arc(phX, phY - 2, 0.6, 0, Math.PI * 2); c.fill();

            // Subtle glow cast onto body
            c.save(); c.globalCompositeOperation = "lighter";
            c.fillStyle = `rgba(${pc},0.06)`;
            c.beginPath();
            c.moveTo(phX - 1, phY - 2); c.lineTo(x - 6, fy - 28); c.lineTo(x + 4, fy - 28); c.lineTo(phX + 1, phY - 2);
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

        // ── draw: vehicles ──
        function drawVehicle(v: Vehicle) {
            const c = ctx!;
            const sx = v.x - camX;
            if (sx < -160 || sx > w + 160) return;
            const dir = v.lane === 0 ? 1 : -1; // lane 0 = left→right, lane 1 = right→left
            // lane 0 is upper half of road, lane 1 is lower half
            const roadMid = groundY + 24;
            const vy = v.lane === 0 ? groundY + 10 : groundY + 20;
            c.save();
            if (dir < 0) { c.translate(sx, 0); c.scale(-1, 1); c.translate(-sx, 0); }

            if (v.type === "car") {
                const W = 38, H = 14;
                // shadow
                c.fillStyle = "rgba(0,0,0,0.18)";
                c.beginPath(); c.ellipse(sx, vy + H, W * 0.5, 3, 0, 0, Math.PI * 2); c.fill();
                // body
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - W / 2, vy, W, H, 3); c.fill();
                // roof
                c.fillStyle = v.accentColor;
                c.beginPath(); c.roundRect(sx - W * 0.28, vy - 9, W * 0.56, 9, [3,3,0,0]); c.fill();
                // windshields
                c.fillStyle = "rgba(150,220,255,0.55)";
                c.beginPath(); c.roundRect(sx - W * 0.26, vy - 8, W * 0.22, 7, 1); c.fill();
                c.beginPath(); c.roundRect(sx + W * 0.04, vy - 8, W * 0.22, 7, 1); c.fill();
                // headlights
                c.fillStyle = "rgba(255,240,180,0.9)";
                c.fillRect(sx + W / 2 - 4, vy + 2, 4, 4);
                c.fillStyle = "rgba(220,50,50,0.9)";
                c.fillRect(sx - W / 2, vy + 2, 4, 4);
                // wheels
                for (const wx2 of [sx - W * 0.3, sx + W * 0.3]) {
                    c.fillStyle = "#111";
                    c.beginPath(); c.ellipse(wx2, vy + H, 5, 5, 0, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "#888";
                    c.beginPath(); c.ellipse(wx2, vy + H, 2.5, 2.5, 0, 0, Math.PI * 2); c.fill();
                }
                // door line
                c.strokeStyle = "rgba(0,0,0,0.2)"; c.lineWidth = 0.7;
                c.beginPath(); c.moveTo(sx + 1, vy + 1); c.lineTo(sx + 1, vy + H - 1); c.stroke();
            } else if (v.type === "van") {
                const W = 50, H = 18;
                c.fillStyle = "rgba(0,0,0,0.18)";
                c.beginPath(); c.ellipse(sx, vy + H, W * 0.5, 3, 0, 0, Math.PI * 2); c.fill();
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - W / 2, vy - 8, W, H + 8, 3); c.fill();
                // windshield
                c.fillStyle = "rgba(150,220,255,0.5)";
                c.beginPath(); c.roundRect(sx + W * 0.18, vy - 7, W * 0.26, 12, 1); c.fill();
                // side windows
                for (let wi = 0; wi < 2; wi++) {
                    c.fillStyle = "rgba(150,220,255,0.3)";
                    c.beginPath(); c.roundRect(sx - W * 0.4 + wi * 14, vy - 5, 10, 8, 1); c.fill();
                }
                // stripe
                c.fillStyle = v.accentColor; c.globalAlpha = 0.3;
                c.fillRect(sx - W / 2, vy + 2, W, 3);
                c.globalAlpha = 1;
                // headlights
                c.fillStyle = "rgba(255,240,180,0.9)"; c.fillRect(sx + W / 2 - 4, vy, 4, 5);
                c.fillStyle = "rgba(220,50,50,0.9)"; c.fillRect(sx - W / 2, vy, 4, 5);
                // wheels
                for (const wx2 of [sx - W * 0.32, sx + W * 0.32]) {
                    c.fillStyle = "#111"; c.beginPath(); c.ellipse(wx2, vy + H, 5.5, 5.5, 0, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "#888"; c.beginPath(); c.ellipse(wx2, vy + H, 2.5, 2.5, 0, 0, Math.PI * 2); c.fill();
                }
            } else if (v.type === "truck") {
                const W = 75, H = 20, cabW = 22;
                c.fillStyle = "rgba(0,0,0,0.2)";
                c.beginPath(); c.ellipse(sx, vy + H, W * 0.5, 3.5, 0, 0, Math.PI * 2); c.fill();
                // trailer
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - W / 2, vy - 12, W - cabW - 2, H + 12, 2); c.fill();
                c.strokeStyle = "rgba(0,0,0,0.15)"; c.lineWidth = 0.5;
                for (let ti = 1; ti < 4; ti++) {
                    c.beginPath(); c.moveTo(sx - W / 2 + ti * 12, vy - 12); c.lineTo(sx - W / 2 + ti * 12, vy + H); c.stroke();
                }
                // cab
                c.fillStyle = v.accentColor;
                c.beginPath(); c.roundRect(sx + W / 2 - cabW, vy - 14, cabW, H + 14, [2,4,2,2]); c.fill();
                // cab windshield
                c.fillStyle = "rgba(150,220,255,0.55)";
                c.beginPath(); c.roundRect(sx + W / 2 - cabW + 3, vy - 13, cabW - 5, 10, 1); c.fill();
                // headlights
                c.fillStyle = "rgba(255,240,180,0.9)"; c.fillRect(sx + W / 2 - 4, vy, 4, 5);
                // wheels (6)
                for (const wx2 of [sx - W * 0.38, sx - W * 0.12, sx + W * 0.32]) {
                    c.fillStyle = "#111"; c.beginPath(); c.ellipse(wx2, vy + H, 6, 6, 0, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "#555"; c.beginPath(); c.ellipse(wx2, vy + H, 3, 3, 0, 0, Math.PI * 2); c.fill();
                }
            } else if (v.type === "bus") {
                const W = 85, H = 22;
                c.fillStyle = "rgba(0,0,0,0.2)";
                c.beginPath(); c.ellipse(sx, vy + H, W * 0.5, 4, 0, 0, Math.PI * 2); c.fill();
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - W / 2, vy - 18, W, H + 18, [3,3,1,1]); c.fill();
                // windows row
                for (let wi = 0; wi < 6; wi++) {
                    c.fillStyle = "rgba(150,220,255,0.45)";
                    c.beginPath(); c.roundRect(sx - W / 2 + 6 + wi * 13, vy - 16, 10, 10, 1); c.fill();
                }
                // door
                c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(sx + W / 2 - 16, vy - 8, 8, H + 8);
                // destination board
                c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(sx - W / 2 + 3, vy - 17, 30, 7);
                c.fillStyle = v.accentColor; c.font = "bold 4px sans-serif"; c.textAlign = "center";
                c.fillText("CITY", sx - W / 2 + 18, vy - 12);
                // headlights
                c.fillStyle = "rgba(255,240,180,0.9)"; c.fillRect(sx + W / 2 - 5, vy + 2, 5, 6);
                c.fillStyle = "rgba(220,50,50,0.9)"; c.fillRect(sx - W / 2, vy + 2, 5, 6);
                // wheels (4)
                for (const wx2 of [sx - W * 0.35, sx + W * 0.35]) {
                    c.fillStyle = "#111"; c.beginPath(); c.ellipse(wx2, vy + H, 6.5, 6.5, 0, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "#555"; c.beginPath(); c.ellipse(wx2, vy + H, 3, 3, 0, 0, Math.PI * 2); c.fill();
                }
                // stripe
                c.fillStyle = v.accentColor; c.globalAlpha = 0.25;
                c.fillRect(sx - W / 2, vy - 4, W, 4);
                c.globalAlpha = 1;
            } else if (v.type === "motorbike") {
                const W = 22;
                c.fillStyle = "rgba(0,0,0,0.15)";
                c.beginPath(); c.ellipse(sx, vy + 6, W * 0.45, 2, 0, 0, Math.PI * 2); c.fill();
                // wheels
                c.fillStyle = "#111";
                c.beginPath(); c.ellipse(sx - W * 0.35, vy + 5, 5.5, 5.5, 0, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.ellipse(sx + W * 0.35, vy + 5, 5.5, 5.5, 0, 0, Math.PI * 2); c.fill();
                c.fillStyle = "#333";
                c.beginPath(); c.ellipse(sx - W * 0.35, vy + 5, 2.5, 2.5, 0, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.ellipse(sx + W * 0.35, vy + 5, 2.5, 2.5, 0, 0, Math.PI * 2); c.fill();
                // frame
                c.strokeStyle = v.color; c.lineWidth = 2.5;
                c.beginPath(); c.moveTo(sx - W * 0.35, vy + 1); c.lineTo(sx, vy - 6); c.lineTo(sx + W * 0.35, vy + 1); c.stroke();
                c.beginPath(); c.moveTo(sx, vy - 6); c.lineTo(sx - 4, vy + 1); c.stroke();
                // fuel tank / body
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - 6, vy - 7, 12, 5, 2); c.fill();
                // rider
                c.fillStyle = "#222"; // helmet
                c.beginPath(); c.arc(sx + 2, vy - 12, 4, 0, Math.PI * 2); c.fill();
                c.fillStyle = "rgba(60,60,80,0.9)"; // body
                c.fillRect(sx - 2, vy - 9, 6, 6);
                // handlebar
                c.strokeStyle = "#777"; c.lineWidth = 1.2;
                c.beginPath(); c.moveTo(sx + W * 0.32, vy - 2); c.lineTo(sx + W * 0.32 + 4, vy - 5); c.stroke();
                // headlight
                c.fillStyle = "rgba(255,240,180,0.9)";
                c.beginPath(); c.arc(sx + W * 0.38, vy + 2, 2, 0, Math.PI * 2); c.fill();
            } else if (v.type === "scooter") {
                const W = 18, wheelSpin = Math.sin(v.frame * 0.4) * 1.5;
                c.fillStyle = "rgba(0,0,0,0.12)";
                c.beginPath(); c.ellipse(sx, vy + 6, 10, 2, 0, 0, Math.PI * 2); c.fill();
                // wheels
                c.fillStyle = "#111";
                c.beginPath(); c.ellipse(sx - W * 0.3, vy + 5, 4, 4, 0, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.ellipse(sx + W * 0.3, vy + 5, 4, 4, 0, 0, Math.PI * 2); c.fill();
                // scooter body (step-through design)
                c.fillStyle = v.color;
                c.beginPath(); c.roundRect(sx - 5, vy - 2, 10, 6, 2); c.fill();
                c.beginPath(); c.roundRect(sx - 3, vy - 8, 7, 6, [3,3,0,0]); c.fill();
                // shield/handlebars
                c.fillStyle = v.accentColor;
                c.beginPath(); c.roundRect(sx + 3, vy - 10, 6, 5, 2); c.fill();
                // rider — standing/seated
                c.fillStyle = "#333";
                c.beginPath(); c.arc(sx + 2, vy - 16, 3.5, 0, Math.PI * 2); c.fill();
                c.fillStyle = "rgba(80,80,100,0.9)";
                c.fillRect(sx - 1, vy - 13, 5, 7);
                // headlight
                c.fillStyle = "rgba(255,240,180,0.8)";
                c.beginPath(); c.arc(sx + W * 0.32, vy + 1, 1.5, 0, Math.PI * 2); c.fill();
            }
            c.restore();
        }

        // ── draw: FG coins ──
        function drawCoinAtScreen(sx: number, cy: number) {
            const c = ctx!;
            const grd = c.createRadialGradient(sx, cy, 0, sx, cy, 12);
            grd.addColorStop(0, "rgba(251,191,36,0.4)");
            grd.addColorStop(1, "rgba(251,191,36,0)");
            c.fillStyle = grd; c.beginPath(); c.arc(sx, cy, 12, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#f59e0b";
            c.beginPath(); c.ellipse(sx, cy, 8, 8, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#fbbf24";
            c.beginPath(); c.ellipse(sx, cy, 6.5, 6.5, 0, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#92400e"; c.font = "bold 5px sans-serif"; c.textAlign = "center";
            c.fillText("$", sx, cy + 2);
            c.fillStyle = "rgba(255,255,255,0.4)";
            c.beginPath(); c.ellipse(sx - 2, cy - 2, 2.5, 1.5, -0.5, 0, Math.PI * 2); c.fill();
        }
        function drawFGCoin(coin: FGCoin) {
            if (coin.collected || coin.type !== 'outside') return;
            const sx = coin.x - camX;
            if (sx < -20 || sx > w + 20) return;
            const bob = Math.sin(tick * 0.06 + coin.bobOffset) * 3;
            drawCoinAtScreen(sx, groundY - 22 + bob);
        }

        // ── draw: HUD ──
        function drawHUD() {
            const c = ctx!;
            const text = `${investorCount}/${TOTAL_CHADS} Chads`;
            c.font = "bold 13px sans-serif"; c.textAlign = "right";
            const tw = c.measureText(text).width;
            c.fillStyle = "rgba(0,0,0,0.7)";
            c.beginPath(); c.roundRect(w - tw - 26, 8, tw + 18, 24, 6); c.fill();
            c.strokeStyle = investorCount >= TOTAL_CHADS ? "rgba(251,191,36,0.5)" : "rgba(34,197,94,0.3)";
            c.lineWidth = 1;
            c.beginPath(); c.roundRect(w - tw - 26, 8, tw + 18, 24, 6); c.stroke();
            c.fillStyle = investorCount >= TOTAL_CHADS ? "#fbbf24" : "#4ade80";
            c.fillText(text, w - 16, 25);
            // coin counter
            const coinText = `${coinCount}/8 $FG`;
            const ctw = c.measureText(coinText).width;
            c.fillStyle = "rgba(0,0,0,0.7)";
            c.beginPath(); c.roundRect(w - ctw - 26, 38, ctw + 18, 24, 6); c.fill();
            c.strokeStyle = coinCount >= 8 ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.3)";
            c.beginPath(); c.roundRect(w - ctw - 26, 38, ctw + 18, 24, 6); c.stroke();
            c.fillStyle = "#fbbf24";
            c.fillText(coinText, w - 16, 55);
            if (investorCount >= TOTAL_CHADS && allSecuredShowUntil < 0) allSecuredShowUntil = tick + 180;
            const allDone = investorCount >= TOTAL_CHADS && coinCount >= 8;
            if (allDone || tick <= allSecuredShowUntil) {
                c.fillStyle = "rgba(0,0,0,0.65)"; c.fillRect(0, h / 2 - 40, w, 80);
                c.fillStyle = "#fbbf24"; c.font = "bold 24px sans-serif"; c.textAlign = "center";
                if (allDone) {
                    c.fillText("🎉 WELL DONE! All Chads & $FG Coins Collected! 🎉", w / 2, h / 2 - 4);
                    c.fillStyle = "rgba(251,191,36,0.6)"; c.font = "14px sans-serif";
                    c.fillText("You've shilled $FG to the whole city!", w / 2, h / 2 + 20);
                } else {
                    c.fillText("ALL CHADS SECURED! Find the $FG coins!", w / 2, h / 2 + 8);
                }
            }
        }

        // ── map floor index ──
        // Returns floor indices; last entry is b.stories (= roof) for buildings with 3+ stories
        function validFloorIndices(b: Bldg): number[] {
            const floors = Array.from({ length: b.stories }, (_, i) => i);
            if (b.stories >= 3) floors.push(b.stories); // roof pseudo-floor
            return floors;
        }
        function floorDisplayNum(fi: number): number {
            return fi;
        }
        function isRoofFloor(b: Bldg, curFloorIdx: number): boolean {
            return curFloorIdx >= b.stories;
        }

        // ── draw: interior scene ──
        function drawInterior() {
            const c = ctx!;
            const b = bldgs[insideBldgIdx];
            const bt = BLDG_TYPES[b.typeIdx];
            const vFloors = validFloorIndices(b);
            const curFloorIdx = vFloors[currentFloor] ?? 0;
            const totalVFloors = vFloors.length;
            const roomW = Math.min(w * 0.45, 204);
            const roomH = 84;
            const roomX = (w - roomW) / 2;
            const roomY = h / 2 - roomH / 2 + 12;
            const floorY = roomY + roomH;

            c.fillStyle = "#050510"; c.fillRect(0, 0, w, h);

            const onRoof = isRoofFloor(b, curFloorIdx);

            if (onRoof) {
                // ── Roof scene ──
                // sky background
                c.fillStyle = SKY; c.fillRect(0, 0, w, h);
                // stars
                c.fillStyle = "rgba(255,255,255,0.5)";
                for (let i = 0; i < 40; i++) {
                    const stX = (i * 97.3 + 13) % w;
                    const stY = (i * 53.7 + 7) % (roomY * 0.8);
                    c.beginPath(); c.arc(stX, stY, ((i * 17) % 3) * 0.3 + 0.3, 0, Math.PI * 2); c.fill();
                }
                // roof surface
                c.fillStyle = "rgba(50,50,65,0.9)";
                c.fillRect(roomX, floorY, roomW, 25);
                c.fillStyle = "rgba(70,70,85,0.7)";
                c.fillRect(roomX, floorY, roomW, 3);
                // edge walls
                c.fillStyle = "rgba(90,90,110,0.6)";
                c.fillRect(roomX, floorY - 12, 4, 12);
                c.fillRect(roomX + roomW - 4, floorY - 12, 4, 12);
                // roof details
                for (const rd of b.roofDetails) {
                    const rdx = roomX + (rd.lx / bldgW(b.cols)) * roomW;
                    if (rd.type === "box") {
                        c.fillStyle = "rgba(80,75,70,0.8)";
                        c.fillRect(rdx - 8, floorY - 10, 16, 10);
                    } else if (rd.type === "ac") {
                        c.fillStyle = "rgba(100,110,120,0.8)";
                        c.fillRect(rdx - 10, floorY - 14, 20, 14);
                        c.fillStyle = "rgba(60,70,80,0.6)";
                        c.fillRect(rdx - 8, floorY - 12, 16, 3);
                        c.fillRect(rdx - 8, floorY - 6, 16, 3);
                    } else if (rd.type === "antenna") {
                        c.strokeStyle = "rgba(150,150,170,0.7)"; c.lineWidth = 1.5;
                        c.beginPath(); c.moveTo(rdx, floorY); c.lineTo(rdx, floorY - 28); c.stroke();
                        c.fillStyle = "rgba(255,60,60,0.8)";
                        c.beginPath(); c.arc(rdx, floorY - 28, 2, 0, Math.PI * 2); c.fill();
                    } else if (rd.type === "vent") {
                        c.fillStyle = "rgba(90,90,100,0.7)";
                        c.beginPath(); c.arc(rdx, floorY - 5, 6, 0, Math.PI * 2); c.fill();
                        c.fillStyle = "rgba(40,40,50,0.9)";
                        c.beginPath(); c.arc(rdx, floorY - 5, 3, 0, Math.PI * 2); c.fill();
                    } else if (rd.type === "pipe") {
                        c.fillStyle = "rgba(110,110,120,0.7)";
                        c.fillRect(rdx - 2, floorY - 18, 4, 18);
                        c.fillRect(rdx - 5, floorY - 18, 10, 3);
                    }
                }
                // additional roof decor: railing along edge
                c.fillStyle = "rgba(100,100,120,0.4)";
                c.fillRect(roomX + 6, floorY - 10, roomW - 12, 1);
                // posts
                for (let rp = 0; rp < 5; rp++) {
                    const rpx = roomX + 10 + rp * (roomW - 20) / 4;
                    c.fillRect(rpx, floorY - 12, 2, 12);
                }
                // satellite dish
                c.fillStyle = "rgba(130,130,150,0.6)";
                c.beginPath(); c.arc(roomX + roomW * 0.85, floorY - 16, 8, Math.PI * 0.6, Math.PI * 0.1, true); c.lineWidth = 2;
                c.strokeStyle = "rgba(130,130,150,0.5)"; c.stroke();
                c.fillStyle = "rgba(130,130,150,0.5)";
                c.fillRect(roomX + roomW * 0.85, floorY - 10, 1.5, 10);
                // water tank
                c.fillStyle = "rgba(70,80,90,0.7)";
                c.fillRect(roomX + roomW * 0.15, floorY - 16, 14, 16);
                c.fillStyle = "rgba(50,60,70,0.5)";
                c.fillRect(roomX + roomW * 0.15, floorY - 16, 14, 3);

                // draw roof people (same ones visible from exterior)
                for (const grp of b.roofGroups) {
                    for (const p of grp.people) {
                        const rpx = roomX + (p.lx / bldgW(b.cols)) * roomW;
                        const rpy = floorY;
                        const rs = 1.0;
                        // legs
                        c.fillStyle = p.pantsColor;
                        c.fillRect(rpx - 2 * rs, rpy - 6 * rs, 1.5 * rs, 6 * rs);
                        c.fillRect(rpx + 0.5 * rs, rpy - 6 * rs, 1.5 * rs, 6 * rs);
                        // body
                        c.fillStyle = p.bodyColor;
                        c.fillRect(rpx - 3 * rs, rpy - 14 * rs, 6 * rs, 8 * rs);
                        // arms
                        c.strokeStyle = p.bodyColor; c.lineWidth = 1.5 * rs;
                        c.beginPath();
                        c.moveTo(rpx - 3 * rs, rpy - 12 * rs); c.lineTo(rpx - 5 * rs, rpy - 6 * rs);
                        c.moveTo(rpx + 3 * rs, rpy - 12 * rs); c.lineTo(rpx + 5 * rs, rpy - 6 * rs);
                        c.stroke();
                        // head
                        c.fillStyle = SKIN;
                        c.beginPath(); c.arc(rpx, rpy - 17 * rs, 3.5 * rs, 0, Math.PI * 2); c.fill();
                        c.fillStyle = "#111";
                        c.fillRect(rpx + 0.5 * rs, rpy - 18 * rs, 1 * rs, 1 * rs);
                        c.fillRect(rpx + 2 * rs, rpy - 18 * rs, 1 * rs, 1 * rs);
                        if (p.hatColor) {
                            c.fillStyle = p.hatColor;
                            c.fillRect(rpx - 4.5 * rs, rpy - 21 * rs, 9 * rs, 2.5 * rs);
                            c.fillRect(rpx - 3 * rs, rpy - 23 * rs, 6 * rs, 2.5 * rs);
                        }
                        // cigarette
                        const smoking = Math.sin(p.frame + tick * 0.03) > 0.3;
                        if (smoking) {
                            c.fillStyle = "rgba(200,180,140,0.9)";
                            c.fillRect(rpx + 4 * rs, rpy - 15 * rs, 5 * rs, 1 * rs);
                            c.fillStyle = "rgba(255,120,30,0.9)";
                            c.beginPath(); c.arc(rpx + 9 * rs, rpy - 14.5 * rs, 0.8, 0, Math.PI * 2); c.fill();
                        }
                    }
                }

                // roof chad
                const chadX = roomX + roomW * 0.55;
                if (b.hasRoofChad) {
                    drawHoodieDude(chadX, floorY, b.roofChadShilled);
                    if (!b.roofChadShilled) {
                        c.fillStyle = "#fbbf24"; c.font = "bold 8px sans-serif"; c.textAlign = "center";
                        c.fillText("CHAD", chadX, floorY - 38);
                    }
                }
                // stairs down (left side)
                const doorW2 = 18, doorH3 = 30;
                const doorX2 = roomX + 6;
                c.fillStyle = "rgba(70,65,60,0.8)";
                c.fillRect(doorX2, floorY - doorH3, doorW2 + 2, doorH3);
                c.fillStyle = "#0a0a16";
                c.fillRect(doorX2 + 3, floorY - doorH3 + 4, doorW2 - 4, doorH3 - 4);
                c.fillStyle = "#aaa"; c.font = "bold 6px monospace"; c.textAlign = "center";
                c.fillText("\u2193 DOWN", doorX2 + doorW2 / 2, floorY - doorH3 - 3);
                // roof door hover highlight
                if (hoverX >= doorX2 && hoverX <= doorX2 + doorW2 + 2 &&
                    hoverY >= floorY - doorH3 && hoverY <= floorY) {
                    c.save();
                    c.strokeStyle = "rgba(74,222,128,0.7)"; c.lineWidth = 2;
                    c.shadowColor = "#4ade80"; c.shadowBlur = 8;
                    c.strokeRect(doorX2, floorY - doorH3, doorW2 + 2, doorH3);
                    c.restore();
                    hoverInteractive = true;
                    el!.style.cursor = "pointer";
                }
                // floor label
                c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "10px sans-serif"; c.textAlign = "center";
                c.fillText(`${bt.name} \u2014 Rooftop  (${currentFloor + 1}/${totalVFloors})`, w / 2, roomY - 8);
                // draw roof coins for this building
                for (const coin of fgCoins) {
                    if (!coin.collected && coin.type === 'roof' && coin.bldgIdx === insideBldgIdx) {
                        const bob = Math.sin(tick * 0.06 + coin.bobOffset) * 3;
                        drawCoinAtScreen(roomX + coin.x, floorY - 14 + bob);
                    }
                }
                // draw FartGirl
                const savedFgX2 = fgX, savedCamX2 = camX, savedGY2 = groundY;
                fgX = roomX + fgInsideX; camX = 0; groundY = floorY;
                drawFG();
                fgX = savedFgX2; camX = savedCamX2; groundY = savedGY2;
                // proximity
                const fgSX2 = roomX + fgInsideX;
                const isNearExit2 = fgSX2 < doorX2 + doorW2 + 20;
                nearStairsUp = false;
                nearInvestor = !!(b.hasRoofChad && !b.roofChadShilled && Math.abs(fgSX2 - chadX) < 45 && pitchAnim === 0);
                if (pitchAnim === 0) {
                    if (isNearExit2) {
                        drawPopup("ENTER to go down", fgSX2, floorY - 55);
                    } else if (nearInvestor) {
                        drawPopup("Shill $FG to the Chad [ENTER]", fgSX2, floorY - 55);
                    } else if (b.hasRoofChad && b.roofChadShilled) {
                        c.fillStyle = "#4ade80"; c.font = "bold 9px sans-serif"; c.textAlign = "center";
                        c.fillText("Chad is shilled! \u2713", chadX, floorY - 42);
                    }
                }
                if (pitchAnim > 0) {
                    pitchAnim--;
                    const t2 = pitchAnim / 60;
                    c.globalAlpha = t2 * 0.5; c.fillStyle = "#22c55e";
                    for (let i = 0; i < 6; i++) {
                        const ppx = fgSX2 + (chadX - fgSX2) * (1 - t2) * 0.8 + Math.sin(tick * 0.3 + i * 1.2) * 12;
                        const ppy = floorY - 15 + Math.cos(tick * 0.2 + i * 1.8) * 8;
                        c.beginPath(); c.arc(ppx, ppy, 5 + i * 2, 0, Math.PI * 2); c.fill();
                    }
                    c.globalAlpha = 1;
                    if (pitchAnim === 0) { b.roofChadShilled = true; investorCount++; }
                }
                drawHUD();
                return;
            }

            // ── Normal interior floor ──
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

            // ── themed interior details (enriched) ──
            const typeName3 = bt.name;
            // helper to draw a simple standing NPC inside
            function drawInteriorNPC(nx: number, ny: number, bodyC: string, headC?: string) {
                c.fillStyle = bodyC;
                c.fillRect(nx - 2, ny - 4, 1.5, 4); c.fillRect(nx + 0.5, ny - 4, 1.5, 4);
                c.fillRect(nx - 2.5, ny - 10, 5, 6);
                c.fillStyle = headC || SKIN;
                c.beginPath(); c.arc(nx, ny - 13, 2.5, 0, Math.PI * 2); c.fill();
                c.fillStyle = "#111";
                c.fillRect(nx - 1.5, ny - 13.5, 1, 0.8);
                c.fillRect(nx + 0.5, ny - 13.5, 1, 0.8);
            }
            if (currentFloor === 0) {
                if (typeName3 === "Bar") {
                    // wood counter
                    const ctrX = roomX + roomW * 0.25, ctrW = roomW * 0.45;
                    c.fillStyle = "rgba(60,40,25,0.85)";
                    c.fillRect(ctrX, floorY - 14, ctrW, 14);
                    c.fillStyle = "rgba(80,55,35,0.6)";
                    c.fillRect(ctrX, floorY - 16, ctrW, 3);
                    // bar top shine
                    c.fillStyle = "rgba(120,90,50,0.2)";
                    c.fillRect(ctrX + 2, floorY - 15, ctrW - 4, 1);
                    // stools with patrons sitting
                    for (let si = 0; si < 3; si++) {
                        const stX = ctrX + 10 + si * (ctrW / 3.5);
                        c.fillStyle = "rgba(50,50,60,0.8)";
                        c.fillRect(stX, floorY - 6, 1.5, 6);
                        c.fillRect(stX - 2.5, floorY - 9, 7, 3);
                        // seated patron
                        const pCols = ["rgba(80,50,50,0.9)", "rgba(50,60,80,0.9)", "rgba(70,60,45,0.9)"];
                        c.fillStyle = pCols[si % pCols.length];
                        c.fillRect(stX - 2, floorY - 18, 5, 9);
                        c.fillStyle = SKIN;
                        c.beginPath(); c.arc(stX + 0.5, floorY - 21, 2.5, 0, Math.PI * 2); c.fill();
                        // drink on counter
                        c.fillStyle = pick(["rgba(200,160,40,0.6)", "rgba(160,50,30,0.5)", "rgba(80,40,20,0.7)"]);
                        c.fillRect(stX + 4, floorY - 19, 3, 5);
                        c.fillStyle = "rgba(255,255,255,0.15)";
                        c.fillRect(stX + 4.5, floorY - 19, 2, 1);
                    }
                    // speech bubble from one patron
                    if (tick % 400 < 200) {
                        const bub = tick % 400 < 100 ? "Cheers!" : "Another round!";
                        c.font = "bold 5px sans-serif"; c.fillStyle = "rgba(0,0,0,0.8)";
                        const btw = c.measureText(bub).width + 6;
                        const bpx = ctrX + 10;
                        c.beginPath(); c.roundRect(bpx - btw / 2, floorY - 32, btw, 9, 3); c.fill();
                        c.fillStyle = "#fbbf24"; c.textAlign = "center";
                        c.fillText(bub, bpx, floorY - 25);
                    }
                    // bartender behind counter
                    drawInteriorNPC(ctrX + ctrW * 0.5, floorY - 14, "rgba(40,40,55,0.9)");
                    // bottles on back shelf
                    c.fillStyle = "rgba(50,35,20,0.7)";
                    c.fillRect(ctrX + 2, roomY + 4, ctrW - 4, 3);
                    c.fillRect(ctrX + 2, roomY + 18, ctrW - 4, 3);
                    for (let bi = 0; bi < 8; bi++) {
                        const bx2 = ctrX + 6 + bi * (ctrW / 9);
                        c.fillStyle = pick(["rgba(80,140,80,0.5)", "rgba(140,80,40,0.5)", "rgba(60,60,120,0.5)", "rgba(180,140,60,0.4)"]);
                        c.fillRect(bx2, roomY + 7, 3, 11);
                        c.fillRect(bx2 + 0.5, roomY + 4, 2, 3);
                    }
                    // taps
                    c.fillStyle = "rgba(200,180,100,0.6)";
                    c.fillRect(ctrX + ctrW * 0.4, roomY + 22, 2, 8);
                    c.fillRect(ctrX + ctrW * 0.6, roomY + 22, 2, 8);
                    // glasses on shelf
                    for (let gi = 0; gi < 4; gi++) {
                        c.fillStyle = "rgba(200,220,255,0.2)";
                        c.fillRect(ctrX + ctrW * 0.7 + gi * 8, roomY + 8, 4, 8);
                    }
                } else if (typeName3 === "Clothes") {
                    // clothing racks
                    for (let ri = 0; ri < 2; ri++) {
                        const rx = roomX + 35 + ri * 42;
                        c.fillStyle = "rgba(120,120,140,0.4)";
                        c.fillRect(rx, roomY + 20, 35, 2);
                        c.fillRect(rx, roomY + 20, 1, 45);
                        c.fillRect(rx + 34, roomY + 20, 1, 45);
                        for (let ci = 0; ci < 4; ci++) {
                            c.fillStyle = pick(["rgba(200,80,80,0.5)", "rgba(80,80,200,0.5)", "rgba(200,200,80,0.5)", "rgba(80,200,80,0.5)", "rgba(200,80,200,0.4)"]);
                            c.fillRect(rx + 4 + ci * 7, roomY + 22, 5, 16);
                        }
                    }
                    // mannequin
                    const mx = roomX + roomW * 0.5;
                    c.fillStyle = "rgba(200,180,160,0.5)";
                    c.fillRect(mx - 1, floorY - 18, 2, 10);
                    c.beginPath(); c.arc(mx, floorY - 20, 2.5, 0, Math.PI * 2); c.fill();
                    c.fillStyle = "rgba(180,60,70,0.5)";
                    c.fillRect(mx - 3, floorY - 12, 6, 6);
                    // mirror
                    c.fillStyle = "rgba(180,200,220,0.2)";
                    c.fillRect(roomX + roomW * 0.6, roomY + 6, 18, 30);
                    c.strokeStyle = "rgba(200,180,100,0.3)"; c.lineWidth = 1;
                    c.strokeRect(roomX + roomW * 0.6, roomY + 6, 18, 30);
                    // shopkeeper
                    drawInteriorNPC(roomX + roomW * 0.68, floorY, "rgba(60,50,80,0.9)");
                } else if (typeName3 === "Vegetables") {
                    // shopkeeper behind main counter
                    const ctrX2 = roomX + roomW * 0.35;
                    c.fillStyle = "rgba(80,55,30,0.8)";
                    c.fillRect(ctrX2, floorY - 16, roomW * 0.35, 16);
                    c.fillStyle = "rgba(100,70,40,0.5)";
                    c.fillRect(ctrX2, floorY - 18, roomW * 0.35, 3);
                    drawInteriorNPC(ctrX2 + roomW * 0.17, floorY - 16, "rgba(50,80,50,0.9)");
                    // fruit/veg tables with baskets
                    const tableSpacing = roomW * 0.1;
                    const tableColors = [
                        { wood: "rgba(90,60,30,0.8)", items: ["rgba(200,50,40,0.7)", "rgba(220,60,50,0.6)"] }, // tomatoes
                        { wood: "rgba(85,55,35,0.8)", items: ["rgba(255,200,30,0.7)", "rgba(230,180,40,0.6)"] }, // bananas
                        { wood: "rgba(95,65,30,0.8)", items: ["rgba(60,180,50,0.7)", "rgba(80,200,60,0.6)"] }, // lettuce
                        { wood: "rgba(80,60,35,0.8)", items: ["rgba(220,120,30,0.7)", "rgba(200,100,40,0.6)"] }, // oranges
                        { wood: "rgba(90,55,30,0.8)", items: ["rgba(140,40,140,0.6)", "rgba(120,50,130,0.6)"] }, // eggplant
                    ];
                    for (let ti = 0; ti < 5; ti++) {
                        const tx = roomX + 40 + ti * tableSpacing;
                        const tc = tableColors[ti];
                        // table/basket
                        c.fillStyle = tc.wood;
                        c.fillRect(tx, floorY - 10, tableSpacing - 4, 10);
                        c.fillStyle = "rgba(120,85,45,0.5)";
                        c.fillRect(tx, floorY - 12, tableSpacing - 4, 3);
                        // produce pile
                        for (let pi = 0; pi < 3; pi++) {
                            c.fillStyle = tc.items[pi % tc.items.length];
                            c.beginPath(); c.arc(tx + 4 + pi * 6, floorY - 15, 2.5, 0, Math.PI * 2); c.fill();
                        }
                    }
                    // hanging basket from ceiling
                    c.fillStyle = "rgba(100,70,35,0.5)";
                    c.fillRect(roomX + roomW * 0.5 - 8, roomY + 2, 1, 10);
                    c.fillRect(roomX + roomW * 0.5 + 8, roomY + 2, 1, 10);
                    c.fillRect(roomX + roomW * 0.5 - 8, roomY + 12, 17, 6);
                    c.fillStyle = "rgba(80,180,40,0.5)";
                    c.beginPath(); c.arc(roomX + roomW * 0.5, roomY + 14, 5, 0, Math.PI * 2); c.fill();
                    // weighing scale
                    c.fillStyle = "rgba(160,160,170,0.5)";
                    c.fillRect(ctrX2 + roomW * 0.28, floorY - 22, 1, 6);
                    c.fillRect(ctrX2 + roomW * 0.25, floorY - 22, 8, 1);
                    c.fillStyle = "rgba(180,180,190,0.4)";
                    c.beginPath(); c.arc(ctrX2 + roomW * 0.25, floorY - 22, 4, 0, Math.PI); c.fill();
                    c.beginPath(); c.arc(ctrX2 + roomW * 0.32, floorY - 22, 4, 0, Math.PI); c.fill();
                } else if (typeName3 === "Bank") {
                    // counter with glass partition
                    const bkCtrX = roomX + roomW * 0.25;
                    const bkCtrW = roomW * 0.4;
                    c.fillStyle = "rgba(60,60,80,0.7)";
                    c.fillRect(bkCtrX, floorY - 22, bkCtrW, 22);
                    c.fillStyle = "rgba(150,200,255,0.12)";
                    c.fillRect(bkCtrX, floorY - 48, bkCtrW, 26);
                    c.strokeStyle = "rgba(150,200,255,0.2)"; c.lineWidth = 0.5;
                    c.strokeRect(bkCtrX, floorY - 48, bkCtrW, 26);
                    // teller behind glass
                    drawInteriorNPC(bkCtrX + bkCtrW * 0.3, floorY - 22, "rgba(40,40,80,0.9)");
                    drawInteriorNPC(bkCtrX + bkCtrW * 0.7, floorY - 22, "rgba(50,40,70,0.9)");
                    // rope barriers
                    c.strokeStyle = "rgba(200,40,40,0.4)"; c.lineWidth = 1;
                    c.beginPath();
                    c.moveTo(bkCtrX - 20, floorY - 10);
                    c.quadraticCurveTo(bkCtrX - 10, floorY - 6, bkCtrX, floorY - 10);
                    c.stroke();
                    c.fillStyle = "rgba(200,180,100,0.5)";
                    c.beginPath(); c.arc(bkCtrX - 20, floorY - 10, 1.5, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(bkCtrX, floorY - 10, 1.5, 0, Math.PI * 2); c.fill();
                    // vault door
                    const vx = roomX + roomW * 0.62;
                    c.fillStyle = "rgba(80,80,100,0.8)";
                    c.beginPath(); c.arc(vx, floorY - 20, 16, Math.PI, 0); c.fill();
                    c.fillRect(vx - 16, floorY - 20, 32, 20);
                    c.fillStyle = "rgba(200,180,100,0.45)";
                    c.beginPath(); c.arc(vx, floorY - 14, 4, 0, Math.PI * 2); c.fill();
                    // vault spokes
                    c.strokeStyle = "rgba(200,180,100,0.3)"; c.lineWidth = 0.8;
                    for (let a = 0; a < 4; a++) {
                        const angle = a * Math.PI / 4;
                        c.beginPath();
                        c.moveTo(vx + Math.cos(angle) * 2, floorY - 14 + Math.sin(angle) * 2);
                        c.lineTo(vx + Math.cos(angle) * 6, floorY - 14 + Math.sin(angle) * 6);
                        c.stroke();
                    }
                    // security guard
                    drawInteriorNPC(roomX + 42, floorY, "rgba(30,30,60,0.9)");
                } else if (typeName3 === "Crypto Exchange") {
                    // monitors on desks
                    const deskX = roomX + 35;
                    const deskW2 = roomW * 0.4;
                    c.fillStyle = "rgba(50,50,65,0.7)";
                    c.fillRect(deskX, floorY - 16, deskW2, 4);
                    c.fillRect(deskX, floorY - 16, 2, 16);
                    c.fillRect(deskX + deskW2 - 2, floorY - 16, 2, 16);
                    for (let mi = 0; mi < 3; mi++) {
                        const mx = deskX + 6 + mi * (deskW2 / 3.5);
                        c.fillStyle = "rgba(20,20,30,0.9)";
                        c.fillRect(mx, floorY - 36, 28, 20);
                        c.fillStyle = "rgba(34,197,94,0.25)";
                        c.fillRect(mx + 2, floorY - 34, 24, 16);
                        // chart line
                        c.strokeStyle = mi % 2 === 0 ? "rgba(34,197,94,0.6)" : "rgba(255,68,68,0.6)"; c.lineWidth = 1;
                        c.beginPath();
                        c.moveTo(mx + 4, floorY - 22);
                        c.lineTo(mx + 10, floorY - 28);
                        c.lineTo(mx + 16, floorY - 24);
                        c.lineTo(mx + 22, floorY - 30);
                        c.stroke();
                        // trader seated
                        drawInteriorNPC(mx + 14, floorY, pick(["rgba(50,50,70,0.9)", "rgba(60,45,55,0.9)"]));
                    }
                    // ticker tape on wall
                    c.fillStyle = "rgba(0,0,0,0.7)";
                    c.fillRect(roomX + 35, roomY + 3, roomW * 0.5, 8);
                    c.fillStyle = "#22c55e"; c.font = "bold 5px monospace"; c.textAlign = "left";
                    const tickers = ["BTC +5.2%", "ETH +3.1%", "SOL +8.7%", "$FG +42%"];
                    const tickOff = (tick * 0.5) % 200;
                    for (let ti = 0; ti < tickers.length; ti++) {
                        c.fillText(tickers[ti], roomX + 38 + ti * 30 - tickOff, roomY + 9);
                    }
                } else if (typeName3 === "Hotel") {
                    // front desk
                    const hdX = roomX + roomW * 0.3;
                    c.fillStyle = "rgba(70,55,40,0.8)";
                    c.fillRect(hdX, floorY - 18, roomW * 0.3, 18);
                    c.fillStyle = "rgba(90,75,55,0.5)";
                    c.fillRect(hdX, floorY - 20, roomW * 0.3, 3);
                    // receptionist
                    drawInteriorNPC(hdX + roomW * 0.15, floorY - 18, "rgba(40,30,50,0.9)");
                    // bell
                    c.fillStyle = "rgba(200,180,100,0.7)";
                    c.beginPath(); c.arc(hdX + roomW * 0.25, floorY - 22, 2, 0, Math.PI * 2); c.fill();
                    // key rack on wall
                    c.fillStyle = "rgba(100,80,60,0.5)";
                    c.fillRect(hdX, roomY + 6, roomW * 0.3, 25);
                    for (let ki = 0; ki < 6; ki++) {
                        c.fillStyle = ki < 4 ? "rgba(200,180,100,0.5)" : "rgba(100,90,70,0.3)";
                        c.beginPath(); c.arc(hdX + 8 + (ki % 3) * 14, roomY + 12 + Math.floor(ki / 3) * 12, 2, 0, Math.PI * 2); c.fill();
                    }
                    // luggage
                    c.fillStyle = "rgba(100,50,40,0.6)";
                    c.fillRect(roomX + roomW * 0.55, floorY - 10, 8, 10);
                    c.fillStyle = "rgba(60,80,100,0.6)";
                    c.fillRect(roomX + roomW * 0.57, floorY - 14, 10, 14);
                    c.fillStyle = "rgba(200,180,100,0.3)";
                    c.fillRect(roomX + roomW * 0.57, floorY - 6, 10, 1);
                    // potted plant
                    c.fillStyle = "rgba(80,55,35,0.7)";
                    c.fillRect(roomX + roomW * 0.66, floorY - 6, 7, 6);
                    c.fillStyle = "rgba(40,140,40,0.6)";
                    c.beginPath(); c.arc(roomX + roomW * 0.66 + 3.5, floorY - 10, 5, 0, Math.PI * 2); c.fill();
                } else if (typeName3 === "Salon") {
                    // salon chairs with mirrors
                    for (let si2 = 0; si2 < 2; si2++) {
                        const sx3 = roomX + 35 + si2 * 45;
                        // mirror
                        c.fillStyle = "rgba(180,200,220,0.2)";
                        c.fillRect(sx3 + 5, roomY + 4, 16, 22);
                        c.strokeStyle = "rgba(200,180,100,0.3)"; c.lineWidth = 0.5;
                        c.strokeRect(sx3 + 5, roomY + 4, 16, 22);
                        // lights around mirror
                        c.fillStyle = "rgba(255,240,200,0.3)";
                        c.beginPath(); c.arc(sx3 + 5, roomY + 8, 1, 0, Math.PI * 2); c.fill();
                        c.beginPath(); c.arc(sx3 + 21, roomY + 8, 1, 0, Math.PI * 2); c.fill();
                        // chair
                        c.fillStyle = "rgba(70,40,50,0.7)";
                        c.fillRect(sx3 + 6, floorY - 12, 14, 12);
                        c.fillRect(sx3 + 4, floorY - 6, 18, 2);
                        // seated customer
                        drawInteriorNPC(sx3 + 13, floorY - 12, pick(["rgba(80,60,50,0.9)", "rgba(50,60,80,0.9)"]));
                    }
                    // product shelves
                    const shX = roomX + roomW * 0.55;
                    c.fillStyle = "rgba(40,40,55,0.7)";
                    c.fillRect(shX, roomY + 4, 25, roomH - 10);
                    for (let sh = 0; sh < 3; sh++) {
                        c.fillStyle = "rgba(60,60,75,0.5)";
                        c.fillRect(shX, roomY + 4 + sh * 14, 25, 2);
                        for (let pi = 0; pi < 3; pi++) {
                            c.fillStyle = pick(["rgba(255,100,150,0.4)", "rgba(100,200,255,0.4)", "rgba(200,150,255,0.4)"]);
                            c.fillRect(shX + 3 + pi * 7, roomY + 8 + sh * 14, 4, 10);
                        }
                    }
                    // hairdresser standing
                    drawInteriorNPC(roomX + 65, floorY, "rgba(60,40,60,0.9)");
                } else if (typeName3 === "Jewelry") {
                    // glass display cases
                    for (let ji = 0; ji < 3; ji++) {
                        const jx = roomX + 35 + ji * 35;
                        c.fillStyle = "rgba(30,30,45,0.8)";
                        c.fillRect(jx, floorY - 16, 30, 16);
                        c.fillStyle = "rgba(150,200,255,0.08)";
                        c.fillRect(jx, floorY - 30, 30, 14);
                        c.strokeStyle = "rgba(150,200,255,0.15)"; c.lineWidth = 0.5;
                        c.strokeRect(jx, floorY - 30, 30, 14);
                        // jewels with sparkle
                        const jewelColors = ["rgba(255,200,50,0.6)", "rgba(100,200,255,0.6)", "rgba(255,80,80,0.5)", "rgba(100,255,150,0.5)"];
                        for (let p = 0; p < 3; p++) {
                            c.fillStyle = jewelColors[(ji + p) % jewelColors.length];
                            c.beginPath(); c.arc(jx + 7 + p * 8, floorY - 24, 2, 0, Math.PI * 2); c.fill();
                            // sparkle
                            if ((tick + ji * 20 + p * 10) % 30 < 10) {
                                c.fillStyle = "rgba(255,255,255,0.5)";
                                c.beginPath(); c.arc(jx + 7 + p * 8 + 1, floorY - 25, 0.5, 0, Math.PI * 2); c.fill();
                            }
                        }
                    }
                    // shopkeeper behind counter
                    drawInteriorNPC(roomX + roomW * 0.65, floorY, "rgba(40,30,50,0.9)");
                    // spotlight on wall
                    c.fillStyle = "rgba(255,240,200,0.05)";
                    c.beginPath(); c.arc(roomX + roomW * 0.45, roomY + 5, 20, 0, Math.PI); c.fill();
                } else if (typeName3 === "Shop") {
                    // pharmacy/shop shelves
                    for (let si3 = 0; si3 < 3; si3++) {
                        const sx4 = roomX + 35 + si3 * 35;
                        c.fillStyle = "rgba(220,220,230,0.15)";
                        c.fillRect(sx4, roomY + 4, 30, roomH - 10);
                        for (let sh2 = 0; sh2 < 3; sh2++) {
                            c.fillStyle = "rgba(200,200,210,0.15)";
                            c.fillRect(sx4, roomY + 4 + sh2 * 14, 30, 2);
                            for (let pi = 0; pi < 3; pi++) {
                                c.fillStyle = pick(["rgba(255,60,60,0.4)", "rgba(60,60,255,0.4)", "rgba(60,200,60,0.4)", "rgba(255,200,60,0.4)"]);
                                c.fillRect(sx4 + 3 + pi * 8, roomY + 8 + sh2 * 14, 4, 10);
                            }
                        }
                    }
                    // cross symbol
                    c.fillStyle = "rgba(255,60,60,0.6)";
                    c.fillRect(roomX + roomW * 0.6, roomY + 6, 12, 3);
                    c.fillRect(roomX + roomW * 0.6 + 4.5, roomY + 2, 3, 11);
                    // cashier counter
                    c.fillStyle = "rgba(60,60,80,0.7)";
                    c.fillRect(roomX + roomW * 0.55, floorY - 14, 25, 14);
                    drawInteriorNPC(roomX + roomW * 0.62, floorY - 14, "rgba(255,255,255,0.7)");
                    // register
                    c.fillStyle = "rgba(40,40,50,0.8)";
                    c.fillRect(roomX + roomW * 0.57, floorY - 20, 10, 6);
                } else if (typeName3 === "Mechanics") {
                    // car on lift
                    const carDX = roomX + roomW * 0.35;
                    const carW2 = 55, carH2 = 22;
                    // hydraulic lift
                    c.fillStyle = "rgba(100,100,120,0.6)";
                    c.fillRect(carDX + 10, floorY - 4, 4, 4);
                    c.fillRect(carDX + carW2 - 14, floorY - 4, 4, 4);
                    c.fillRect(carDX, floorY - 6, carW2, 3);
                    // car body
                    c.fillStyle = "rgba(60,60,80,0.7)";
                    c.fillRect(carDX, floorY - 6 - carH2 * 0.5, carW2, carH2 * 0.5);
                    c.fillRect(carDX + carW2 * 0.15, floorY - 6 - carH2 * 0.8, carW2 * 0.6, carH2 * 0.35);
                    c.fillStyle = "rgba(100,140,200,0.3)";
                    c.fillRect(carDX + carW2 * 0.2, floorY - 6 - carH2 * 0.75, carW2 * 0.2, carH2 * 0.25);
                    c.fillRect(carDX + carW2 * 0.5, floorY - 6 - carH2 * 0.75, carW2 * 0.2, carH2 * 0.25);
                    // wheels
                    c.fillStyle = "rgba(30,30,40,0.8)";
                    c.beginPath(); c.arc(carDX + 10, floorY - 7, 4, 0, Math.PI * 2); c.fill();
                    c.beginPath(); c.arc(carDX + carW2 - 10, floorY - 7, 4, 0, Math.PI * 2); c.fill();
                    // tool rack on wall
                    c.fillStyle = "rgba(60,50,40,0.6)";
                    c.fillRect(roomX + 40, roomY + 6, 30, 24);
                    // tools (wrench, hammer, screwdriver shapes)
                    c.strokeStyle = "rgba(160,160,170,0.5)"; c.lineWidth = 1.5;
                    c.beginPath(); c.moveTo(roomX + 46, roomY + 10); c.lineTo(roomX + 46, roomY + 26); c.stroke();
                    c.beginPath(); c.moveTo(roomX + 54, roomY + 10); c.lineTo(roomX + 54, roomY + 26); c.stroke();
                    c.beginPath(); c.moveTo(roomX + 62, roomY + 10); c.lineTo(roomX + 62, roomY + 26); c.stroke();
                    // oil barrel
                    c.fillStyle = "rgba(40,40,50,0.7)";
                    c.fillRect(roomX + roomW * 0.62, floorY - 12, 10, 12);
                    c.fillStyle = "rgba(80,80,90,0.5)";
                    c.fillRect(roomX + roomW * 0.62, floorY - 12, 10, 2);
                    c.fillRect(roomX + roomW * 0.62, floorY - 6, 10, 2);
                    // mechanic working
                    drawInteriorNPC(carDX - 12, floorY, "rgba(60,60,80,0.9)");
                    // price tag
                    c.fillStyle = "rgba(255,200,50,0.6)"; c.font = "bold 5px monospace"; c.textAlign = "center";
                    c.fillText("$$$", carDX + carW2 / 2, floorY - 6 - carH2 - 3);
                }
            } else {
                // upper floor: more detail
                // window on back wall
                c.fillStyle = "rgba(5,5,14,0.7)";
                const winW = Math.min(25, roomW * 0.12);
                c.fillRect(roomX + roomW * 0.4, roomY + 8, winW, 18);
                c.strokeStyle = "rgba(120,140,180,0.2)"; c.lineWidth = 0.5;
                c.strokeRect(roomX + roomW * 0.4, roomY + 8, winW, 18);
                c.fillStyle = "rgba(140,160,200,0.08)";
                c.fillRect(roomX + roomW * 0.4 + 1, roomY + 9, winW - 2, 16);
                // cross bars
                c.fillStyle = "rgba(100,100,120,0.2)";
                c.fillRect(roomX + roomW * 0.4 + winW / 2 - 0.5, roomY + 8, 1, 18);
                c.fillRect(roomX + roomW * 0.4, roomY + 16, winW, 1);
                // potted plant (alternating floors)
                if (currentFloor % 2 === 1) {
                    c.fillStyle = "rgba(80,60,40,0.6)";
                    c.fillRect(roomX + roomW * 0.55, floorY - 6, 8, 6);
                    c.fillStyle = "rgba(40,140,40,0.5)";
                    c.beginPath(); c.arc(roomX + roomW * 0.55 + 4, floorY - 10, 4, 0, Math.PI * 2); c.fill();
                }
                // small table
                c.fillStyle = "rgba(60,50,40,0.5)";
                c.fillRect(roomX + roomW * 0.42, floorY - 8, 14, 8);
                c.fillStyle = "rgba(80,65,50,0.4)";
                c.fillRect(roomX + roomW * 0.42, floorY - 10, 14, 3);
            }

            // exit / stairs-down (left side)
            const doorW = 18, doorH2 = 30;
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
            const stairX = roomX + roomW - 24;
            const stairW = 18, stairH2 = 30;
            if (currentFloor < totalVFloors - 1) {
                // clip stairs to door frame so steps don't bleed out
                c.save();
                c.beginPath();
                c.rect(stairX, floorY - stairH2, stairW, stairH2);
                c.clip();
                c.fillStyle = "#0a0a16"; c.fillRect(stairX, floorY - stairH2, stairW, stairH2);
                for (let si = 0; si < 4; si++) {
                    c.fillStyle = "rgba(100,100,140,0.3)";
                    c.fillRect(stairX + 2 + si * 3, floorY - 6 - si * 6, stairW - 4, 2);
                }
                c.restore();
                c.strokeStyle = "rgba(100,100,140,0.4)"; c.lineWidth = 0.5; c.strokeRect(stairX, floorY - stairH2, stairW, stairH2);
                c.fillStyle = "#4ade80"; c.font = "bold 6px monospace"; c.textAlign = "center";
                c.fillText("\u2191 UP", stairX + stairW / 2, floorY - stairH2 - 3);
            }

            // hover highlights for interior doors
            if (hoverX >= 0) {
                // stairs up hover
                if (currentFloor < totalVFloors - 1 &&
                    hoverX >= stairX && hoverX <= stairX + stairW &&
                    hoverY >= floorY - stairH2 && hoverY <= floorY) {
                    c.save();
                    c.strokeStyle = "rgba(74,222,128,0.7)"; c.lineWidth = 2;
                    c.shadowColor = "#4ade80"; c.shadowBlur = 8;
                    c.strokeRect(stairX, floorY - stairH2, stairW, stairH2);
                    c.restore();
                    hoverInteractive = true;
                }
                // exit/down door hover
                if (hoverX >= doorX && hoverX <= doorX + doorW &&
                    hoverY >= floorY - doorH2 && hoverY <= floorY) {
                    c.save();
                    c.strokeStyle = "rgba(74,222,128,0.7)"; c.lineWidth = 2;
                    c.shadowColor = "#4ade80"; c.shadowBlur = 8;
                    c.strokeRect(doorX, floorY - doorH2, doorW, doorH2);
                    c.restore();
                    hoverInteractive = true;
                }
            }
            el!.style.cursor = hoverInteractive ? "pointer" : "default";

            // elevator for buildings with 3+ stories (not on roof)
            const elevX = roomX + roomW - 48;
            const elevW = 16, elevH = 30;
            const hasElevator = b.stories >= 3 && !onRoof;
            if (hasElevator) {
                // elevator door
                c.fillStyle = "rgba(120,120,140,0.6)";
                c.fillRect(elevX, floorY - elevH, elevW, elevH);
                // split door lines
                c.fillStyle = "rgba(80,80,100,0.8)";
                c.fillRect(elevX + elevW / 2 - 0.5, floorY - elevH, 1, elevH);
                // frame
                c.strokeStyle = "rgba(160,160,180,0.4)"; c.lineWidth = 1;
                c.strokeRect(elevX, floorY - elevH, elevW, elevH);
                // up/down arrows
                c.fillStyle = "rgba(200,200,220,0.5)"; c.font = "bold 5px sans-serif"; c.textAlign = "center";
                c.fillText("\u25B2", elevX + elevW + 5, floorY - elevH + 8);
                c.fillText("\u25BC", elevX + elevW + 5, floorY - elevH + 16);
                // indicator light
                c.fillStyle = "rgba(34,197,94,0.6)";
                c.beginPath(); c.arc(elevX + elevW / 2, floorY - elevH - 4, 2, 0, Math.PI * 2); c.fill();
                // hover highlight
                if (hoverX >= elevX && hoverX <= elevX + elevW + 10 &&
                    hoverY >= floorY - elevH && hoverY <= floorY) {
                    c.save();
                    c.strokeStyle = "rgba(74,222,128,0.7)"; c.lineWidth = 2;
                    c.shadowColor = "#4ade80"; c.shadowBlur = 8;
                    c.strokeRect(elevX, floorY - elevH, elevW, elevH);
                    c.restore();
                    hoverInteractive = true;
                    el!.style.cursor = "pointer";
                }
                // proximity detection
                const fgSXe = roomX + fgInsideX;
                nearElevator = Math.abs(fgSXe - (elevX + elevW / 2)) < 20;
            }

            // elevator panel overlay
            if (elevatorOpen && hasElevator) {
                const elevFloors = totalVFloors - 1; // exclude roof
                const maxPanelH = Math.min(elevFloors * 22 + 36, Math.round(h * 0.85));
                const btnSlot = Math.max(14, Math.floor((maxPanelH - 36) / Math.max(1, elevFloors)));
                const panelH = elevFloors * btnSlot + 36;
                const panelW = 110;
                const panelX = (w - panelW) / 2;
                const panelY = (h - panelH) / 2;
                // dark overlay
                c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, 0, w, h);
                // panel background
                c.fillStyle = "rgba(20,20,35,0.95)";
                c.beginPath(); c.roundRect(panelX, panelY, panelW, panelH, 6); c.fill();
                c.strokeStyle = "rgba(74,222,128,0.4)"; c.lineWidth = 1;
                c.beginPath(); c.roundRect(panelX, panelY, panelW, panelH, 6); c.stroke();
                // title
                c.fillStyle = "#4ade80"; c.font = "bold 8px sans-serif"; c.textAlign = "center";
                c.fillText("ELEVATOR", panelX + panelW / 2, panelY + 14);
                // floor buttons (clipped to panel interior)
                c.save();
                c.beginPath(); c.rect(panelX + 1, panelY + 18, panelW - 2, panelH - 26); c.clip();
                for (let fi = 0; fi < elevFloors; fi++) {
                    const btnY = panelY + 22 + fi * btnSlot;
                    const btnX = panelX + 8;
                    const btnW2 = panelW - 16;
                    const btnH2 = btnSlot - 4;
                    const isCurrentFloor = fi === currentFloor;
                    const hoveringBtn = hoverX >= btnX && hoverX <= btnX + btnW2 && hoverY >= btnY && hoverY <= btnY + btnH2;
                    c.fillStyle = isCurrentFloor ? "rgba(34,197,94,0.3)" : hoveringBtn ? "rgba(74,222,128,0.15)" : "rgba(40,40,60,0.7)";
                    c.beginPath(); c.roundRect(btnX, btnY, btnW2, btnH2, 3); c.fill();
                    c.strokeStyle = isCurrentFloor ? "rgba(34,197,94,0.6)" : "rgba(100,100,140,0.4)";
                    c.lineWidth = 0.5;
                    c.beginPath(); c.roundRect(btnX, btnY, btnW2, btnH2, 3); c.stroke();
                    const floorLabel = fi === 0 ? "Ground" : `Floor ${fi}`;
                    c.fillStyle = isCurrentFloor ? "#4ade80" : "#ccc";
                    c.font = "bold 7px sans-serif"; c.textAlign = "center";
                    c.fillText(floorLabel, panelX + panelW / 2, btnY + btnH2 * 0.7);
                    if (hoveringBtn) { hoverInteractive = true; el!.style.cursor = "pointer"; }
                }
                c.restore();
                // close hint
                c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "7px sans-serif"; c.textAlign = "center";
                c.fillText("ESC to close", panelX + panelW / 2, panelY + panelH - 6);
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

            // draw inside coins on this floor
            for (const coin of fgCoins) {
                if (!coin.collected && coin.type === 'inside' && coin.bldgIdx === insideBldgIdx && coin.floorIdx === curFloorIdx) {
                    const bob = Math.sin(tick * 0.06 + coin.bobOffset) * 3;
                    drawCoinAtScreen(roomX + coin.x, floorY - 14 + bob);
                }
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

            if (pitchAnim === 0 && !elevatorOpen) {
                if (isNearExit && !nearStairsUp) {
                    drawPopup(currentFloor === 0 ? "ENTER to exit" : "ENTER to go down", fgSX, floorY - 55);
                } else if (nearStairsUp) {
                    drawPopup("ENTER to go up", fgSX, floorY - 55);
                } else if (nearElevator && hasElevator) {
                    drawPopup("ENTER for elevator", fgSX, floorY - 55);
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

        // ── click/touch-to-walk + hover ──
        let walkTarget: number | null = null;
        let walkTargetInside: number | null = null;
        let pendingInteriorAction = false; // fire action when she arrives at walk target
        let clickedDoor = false; // true only when click was directly on a door rect
        let hoverX = -1, hoverY = -1; // canvas-space mouse position
        let hoverInteractive = false; // whether hovering over an interactive element

        function getCanvasPos(clientX: number, clientY: number) {
            const r = el!.getBoundingClientRect();
            return { cx: clientX - r.left, cy: clientY - r.top };
        }

        function canvasMouseMove(e: MouseEvent) {
            const { cx, cy } = getCanvasPos(e.clientX, e.clientY);
            hoverX = cx; hoverY = cy;
        }
        function canvasMouseLeave() { hoverX = -1; hoverY = -1; hoverInteractive = false; el!.style.cursor = "default"; }
        el.addEventListener("mousemove", canvasMouseMove);
        el.addEventListener("mouseleave", canvasMouseLeave);

        function handleClickWalk(clientX: number, clientY: number) {
            const { cx, cy } = getCanvasPos(clientX, clientY);
            if (insideBldgIdx >= 0) {
                // check if elevator panel is open — handle floor button clicks
                if (elevatorOpen) {
                    const b = bldgs[insideBldgIdx];
                    const vFloors = validFloorIndices(b);
                    const elevFloors2 = vFloors.length - 1; // exclude roof
                    const maxPanelH2 = Math.min(elevFloors2 * 22 + 36, Math.round(h * 0.85));
                    const btnSlot2 = Math.max(14, Math.floor((maxPanelH2 - 36) / Math.max(1, elevFloors2)));
                    const panelH2 = elevFloors2 * btnSlot2 + 36;
                    const panelW2 = 110;
                    const panelX2 = (w - panelW2) / 2;
                    const panelY2 = (h - panelH2) / 2;
                    let clickedFloor = -1;
                    for (let fi = 0; fi < elevFloors2; fi++) {
                        const btnY = panelY2 + 22 + fi * btnSlot2;
                        const btnX = panelX2 + 8;
                        const btnW2c = panelW2 - 16;
                        const btnH2c = btnSlot2 - 4;
                        if (cx >= btnX && cx <= btnX + btnW2c && cy >= btnY && cy <= btnY + btnH2c) {
                            clickedFloor = fi;
                            break;
                        }
                    }
                    if (clickedFloor >= 0 && clickedFloor !== currentFloor) {
                        currentFloor = clickedFloor;
                        const roomW3 = Math.min(w * 0.45, 204);
                        fgInsideX = roomW3 - 40; // appear at elevator door (elevX=roomW-48, w=16, center=roomW-40)
                        fgMoving = false;
                        walkTargetInside = null;
                        needsHairReset = true;
                        transitionFade = 0;
                        elevatorOpen = false;
                    } else {
                        elevatorOpen = false;
                    }
                    return;
                }
                const roomW2 = Math.min(w * 0.45, 204);
                const roomX2 = (w - roomW2) / 2;
                walkTargetInside = Math.max(12, Math.min(roomW2 - 12, cx - roomX2));
                pendingInteriorAction = true;
            } else {
                const clickWorldX = cx + camX;
                let snapped = false;
                clickedDoor = false;
                for (const b of bldgs) {
                    const ph = bldgH(b.stories);
                    const bsx2 = b.x - camX;
                    const pw2 = bldgW(b.cols);
                    if (bsx2 + pw2 < -10 || bsx2 > w + 10) continue;
                    const gfY2 = groundY - ph + floorLY(b.stories, 0);
                    const gfH2 = span(FLOOR_H);
                    for (const el2 of b.ground) {
                        if (el2.type !== "door") continue;
                        const doorX2 = b.x + cellLX(el2.gx);
                        const doorW2 = span(el2.gw);
                        const doorCX = doorX2 + doorW2 / 2;
                        const doorSX = doorX2 - camX;
                        // check if click is directly on the door rectangle
                        const onDoorX = cx >= doorSX && cx <= doorSX + doorW2;
                        const onDoorY = cy >= gfY2 && cy <= gfY2 + gfH2;
                        if (onDoorX && onDoorY) {
                            // clicked directly on door — walk there and auto-enter
                            walkTarget = doorCX;
                            clickedDoor = true;
                            snapped = true;
                            break;
                        } else if (Math.abs(clickWorldX - doorCX) < doorW2 + 15) {
                            // clicked near door (above it, etc) — walk to door but don't enter
                            walkTarget = doorCX;
                            snapped = true;
                            break;
                        }
                    }
                    if (snapped) break;
                }
                if (!snapped) {
                    walkTarget = clickWorldX;
                }
            }
        }

        function canvasClick(e: MouseEvent) {
            handleClickWalk(e.clientX, e.clientY);
        }
        function canvasTouch(e: TouchEvent) {
            if (e.touches.length > 0) {
                handleClickWalk(e.touches[0].clientX, e.touches[0].clientY);
            }
        }
        el.addEventListener("click", canvasClick);
        el.addEventListener("touchstart", canvasTouch, { passive: true });

        // ── main loop ──
        function loop() {
            tick++;
            const c = ctx!;

            if (insideBldgIdx >= 0) {
                // ── Interior mode ──
                fgMoving = false;
                // keyboard overrides walk target
                if (keys["ArrowLeft"] || keys["a"]) { fgInsideX -= FG_SPD; fgDir = -1; fgMoving = true; walkTargetInside = null; }
                if (keys["ArrowRight"] || keys["d"]) { fgInsideX += FG_SPD; fgDir = 1; fgMoving = true; walkTargetInside = null; }
                // walk-to-target (click/touch)
                if (!fgMoving && walkTargetInside !== null) {
                    const dx = walkTargetInside - fgInsideX;
                    if (Math.abs(dx) > 3) {
                        fgInsideX += Math.sign(dx) * FG_SPD;
                        fgDir = dx > 0 ? 1 : -1;
                        fgMoving = true;
                    } else {
                        walkTargetInside = null;
                        if (pendingInteriorAction) {
                            pendingInteriorAction = false;
                            actionPressed = true;
                        }
                    }
                }
                if (fgMoving) fgFrame++;
                const roomW = Math.min(w * 0.45, 204);
                fgInsideX = Math.max(12, Math.min(roomW - 12, fgInsideX));

                const roomX = (w - roomW) / 2;
                const roomH = 84;
                const roomY = h / 2 - roomH / 2 + 12;
                const floorY = roomY + roomH;
                const fgSX = roomX + fgInsideX;
                const doorEnd = roomX + 6 + 20 + 20;
                const isNearExit = fgSX < doorEnd;

                const b = bldgs[insideBldgIdx];
                const vFloors = validFloorIndices(b);
                const curFloorIdx = vFloors[currentFloor] ?? 0;
                const onRoof = isRoofFloor(b, curFloorIdx);
                const fd = onRoof ? null : b.floors[curFloorIdx];
                const chadX = roomX + roomW * 0.55;
                const stairCenterX = roomX + roomW - 24 + 9;
                nearStairsUp = !onRoof && currentFloor < vFloors.length - 1 && Math.abs(fgSX - stairCenterX) < 25;
                // recalculate nearElevator with current frame position (avoids stale value from prior drawInterior)
                const elevCenterX2 = roomX + roomW - 40;
                nearElevator = !onRoof && b.stories >= 3 && Math.abs(fgSX - elevCenterX2) < 20;
                if (onRoof) {
                    nearInvestor = !!(b.hasRoofChad && !b.roofChadShilled && Math.abs(fgSX - chadX) < 45 && pitchAnim === 0);
                } else {
                    nearInvestor = !!(fd && fd.hasChadHere && !fd.chadShilled && Math.abs(fgSX - chadX) < 45 && pitchAnim === 0);
                }

                if (actionPressed) {
                    if (nearStairsUp && pitchAnim === 0) {
                        // stairs take priority over elevator
                        currentFloor++;
                        fgInsideX = 15; // appear at down/exit door (doorX=6, w=18, center=15)
                        fgMoving = false;
                        walkTargetInside = null;
                        elevatorOpen = false;
                        needsHairReset = true; transitionFade = 0;
                    } else if (nearElevator && pitchAnim === 0 && !elevatorOpen) {
                        elevatorOpen = true;
                    } else if (isNearExit && pitchAnim === 0) {
                        if (currentFloor > 0) {
                            currentFloor--;
                            fgInsideX = roomW - 15; // appear at stairs-up door (stairX=roomW-24, w=18, center=roomW-15)
                            fgMoving = false;
                            walkTargetInside = null;
                            elevatorOpen = false;
                            needsHairReset = true; transitionFade = 0;
                        } else {
                            insideBldgIdx = -1;
                            fgMoving = false;
                            walkTarget = null;
                            elevatorOpen = false;
                            needsHairReset = true; transitionFade = 0;
                        }
                    } else if (nearInvestor && pitchAnim === 0) {
                        pitchAnim = 60;
                    }
                }

                // interior coin collect (uses already-calculated curFloorIdx, onRoof, b)
                for (const coin of fgCoins) {
                    if (coin.collected || coin.bldgIdx !== insideBldgIdx) continue;
                    if (coin.type === 'inside' && !onRoof && coin.floorIdx === curFloorIdx) {
                        if (Math.abs(fgInsideX - coin.x) < 18) {
                            coin.collected = true;
                            if (b.floors[curFloorIdx]) b.floors[curFloorIdx].coinRef = null;
                            coinCount++;
                        }
                    } else if (coin.type === 'roof' && onRoof) {
                        if (Math.abs(fgInsideX - coin.x) < 18) {
                            coin.collected = true;
                            coinCount++;
                        }
                    }
                }

                if (insideBldgIdx >= 0) drawInterior();
            } else {
                // ── Exterior mode ──
                fgMoving = false;
                // keyboard overrides walk target
                if (keys["ArrowLeft"] || keys["a"]) { fgX -= FG_SPD; fgDir = -1; fgMoving = true; walkTarget = null; }
                if (keys["ArrowRight"] || keys["d"]) { fgX += FG_SPD; fgDir = 1; fgMoving = true; walkTarget = null; }
                // walk-to-target (click/touch)
                let walkArrived = false;
                if (!fgMoving && walkTarget !== null) {
                    const dx = walkTarget - fgX;
                    if (Math.abs(dx) > 3) {
                        fgX += Math.sign(dx) * FG_SPD;
                        fgDir = dx > 0 ? 1 : -1;
                        fgMoving = true;
                    } else {
                        walkArrived = true;
                        walkTarget = null;
                    }
                }
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

                // vehicle movement
                for (const v of vehicles) {
                    v.x += v.spd;
                    v.frame += Math.abs(v.spd);
                    if (v.lane === 0 && v.x > WORLD + 120) v.x = -120;
                    if (v.lane === 1 && v.x < -120) v.x = WORLD + 120;
                }

                // coin collect check
                // exterior — collect only outside coins
                for (const coin of fgCoins) {
                    if (!coin.collected && coin.type === 'outside' && Math.abs(fgX - coin.x) < 18) {
                        coin.collected = true;
                        coinCount++;
                    }
                }

                // door proximity
                nearDoorBldgIdx = -1;
                for (let bi = 0; bi < bldgs.length; bi++) {
                    const b = bldgs[bi];
                    for (const el of b.ground) {
                        if (el.type !== "door") continue;
                        const doorWorldX = b.x + cellLX(el.gx) + span(el.gw) / 2;
                        if (Math.abs(fgX - doorWorldX) < 20) { nearDoorBldgIdx = bi; break; }
                    }
                    if (nearDoorBldgIdx >= 0) break;
                }

                if (nearDoorBldgIdx >= 0 && (actionPressed || (walkArrived && clickedDoor))) {
                    insideBldgIdx = nearDoorBldgIdx;
                    currentFloor = 0;
                    fgInsideX = 15; // centered on exit door (doorX=6, w=18, center=15)
                    fgMoving = false;
                    walkTarget = null;
                    walkTargetInside = null;
                    actionPressed = false;
                    clickedDoor = false;
                    needsHairReset = true; transitionFade = 0;
                }
                if (walkArrived) clickedDoor = false;

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

                // parallax background city silhouettes
                drawBgCity();

                for (const b of bldgs) drawBldg(b);
                for (const sl of slights) drawSL(sl);

                // ── hover detection: highlight interactive doors ──
                hoverInteractive = false;
                if (hoverX >= 0) {
                    const worldHX = hoverX + camX;
                    for (const b of bldgs) {
                        const pw = bldgW(b.cols), ph = bldgH(b.stories);
                        const bsx = b.x - camX;
                        if (bsx + pw < 0 || bsx > w) continue;
                        const by2 = groundY - ph;
                        const gfY2 = by2 + floorLY(b.stories, 0);
                        const gfH2 = span(FLOOR_H);
                        for (const el2 of b.ground) {
                            if (el2.type !== "door") continue;
                            const dx = b.x + cellLX(el2.gx);
                            const dw = span(el2.gw);
                            if (worldHX >= dx && worldHX <= dx + dw && hoverY >= gfY2 && hoverY <= gfY2 + gfH2) {
                                hoverInteractive = true;
                                // draw highlight
                                c.save();
                                c.strokeStyle = "rgba(74,222,128,0.7)";
                                c.lineWidth = 2;
                                c.shadowColor = "#4ade80";
                                c.shadowBlur = 8;
                                c.strokeRect(dx - camX, gfY2, dw, gfH2);
                                c.restore();
                            }
                        }
                    }
                }
                el!.style.cursor = hoverInteractive ? "pointer" : "default";

                c.fillStyle = GROUND; c.fillRect(0, groundY, w, PAVE_H);
                c.fillStyle = PAVEMENT; c.fillRect(0, groundY, w, SIDE_H);
                c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(0, groundY + PAVE_H / 2 - 0.5, w, 1);
                c.strokeStyle = "rgba(255,200,50,0.15)"; c.lineWidth = 1; c.setLineDash([12, 18]);
                c.beginPath(); c.moveTo(0, groundY + PAVE_H / 2); c.lineTo(w, groundY + PAVE_H / 2); c.stroke();
                c.setLineDash([]);

                // ── sidewalk shop props ──
                for (const b of bldgs) {
                    for (const sp of b.shopProps) {
                        const spx = b.x + sp.lx - camX;
                        if (spx < -20 || spx > w + 20) continue;
                        const spy = groundY;
                        if (sp.type === "barrel") {
                            c.fillStyle = "rgba(120,80,40,0.7)";
                            c.fillRect(spx - 4, spy - 8, 8, 8);
                            c.fillStyle = "rgba(90,60,30,0.5)";
                            c.fillRect(spx - 4, spy - 8, 8, 1);
                            c.fillRect(spx - 4, spy - 4, 8, 1);
                        } else if (sp.type === "crate") {
                            c.fillStyle = "rgba(100,80,50,0.7)";
                            c.fillRect(spx - 4, spy - 6, 8, 6);
                            c.strokeStyle = "rgba(70,55,35,0.5)"; c.lineWidth = 0.5;
                            c.strokeRect(spx - 4, spy - 6, 8, 6);
                        } else if (sp.type === "planter") {
                            c.fillStyle = "rgba(80,60,40,0.7)";
                            c.fillRect(spx - 5, spy - 5, 10, 5);
                            c.fillStyle = "rgba(34,120,40,0.7)";
                            c.beginPath(); c.arc(spx, spy - 8, 4, 0, Math.PI * 2); c.fill();
                        } else if (sp.type === "sign") {
                            c.fillStyle = "rgba(140,140,160,0.6)";
                            c.fillRect(spx - 0.5, spy - 12, 1, 12);
                            c.fillStyle = "rgba(30,30,40,0.8)";
                            c.fillRect(spx - 5, spy - 14, 10, 6);
                            c.fillStyle = "rgba(74,222,128,0.5)";
                            c.fillRect(spx - 4, spy - 13, 8, 4);
                        } else if (sp.type === "mannequin") {
                            c.fillStyle = "rgba(200,180,160,0.5)";
                            c.fillRect(spx - 1, spy - 12, 2, 6);
                            c.beginPath(); c.arc(spx, spy - 14, 2, 0, Math.PI * 2); c.fill();
                            c.fillRect(spx - 2, spy - 6, 4, 6);
                        } else if (sp.type === "atm") {
                            c.fillStyle = "rgba(60,60,80,0.8)";
                            c.fillRect(spx - 4, spy - 12, 8, 12);
                            c.fillStyle = "rgba(100,200,255,0.4)";
                            c.fillRect(spx - 3, spy - 11, 6, 4);
                        } else if (sp.type === "cone") {
                            c.fillStyle = "rgba(255,120,0,0.7)";
                            c.beginPath();
                            c.moveTo(spx - 3, spy);
                            c.lineTo(spx, spy - 8);
                            c.lineTo(spx + 3, spy);
                            c.closePath(); c.fill();
                        } else if (sp.type === "tire") {
                            c.fillStyle = "rgba(40,40,50,0.7)";
                            c.beginPath(); c.arc(spx, spy - 4, 4, 0, Math.PI * 2); c.fill();
                            c.fillStyle = "rgba(60,60,70,0.5)";
                            c.beginPath(); c.arc(spx, spy - 4, 2, 0, Math.PI * 2); c.fill();
                        } else if (sp.type === "satellite") {
                            c.fillStyle = "rgba(140,140,160,0.6)";
                            c.fillRect(spx - 0.5, spy - 10, 1, 10);
                            c.beginPath(); c.arc(spx, spy - 10, 3, Math.PI * 0.8, Math.PI * 0.2, true);
                            c.strokeStyle = "rgba(140,140,160,0.7)"; c.lineWidth = 1; c.stroke();
                        } else if (sp.type === "lamp") {
                            c.fillStyle = "rgba(160,140,100,0.6)";
                            c.fillRect(spx - 0.5, spy - 14, 1, 14);
                            c.fillStyle = "rgba(255,220,130,0.4)";
                            c.beginPath(); c.arc(spx, spy - 14, 2.5, 0, Math.PI * 2); c.fill();
                        }
                    }
                }

                for (const n of npcs) drawPerson(n.x, groundY, n.dir, n.body, n.hat, n.f, 1.0);
                for (const sm of alleySmokers) drawAlleySmoker(sm);
                for (const coin of fgCoins) drawFGCoin(coin);
                // draw roof coins visible from street
                for (const coin of fgCoins) {
                    if (coin.collected || coin.type !== 'roof') continue;
                    const rb = bldgs[coin.bldgIdx];
                    if (!rb) continue;
                    const rbsx = rb.x - camX;
                    if (rbsx + bldgW(rb.cols) < -10 || rbsx > w + 10) continue;
                    const rbph = bldgH(rb.stories);
                    const roofY = groundY - rbph;
                    // map coin.x (room-relative 0-204) to building screen x proportionally
                    const roomW = Math.min(w * 0.45, 204);
                    const coinSX = rbsx + (coin.x / roomW) * bldgW(rb.cols);
                    const bob = Math.sin(tick * 0.06 + coin.bobOffset) * 2;
                    drawCoinAtScreen(coinSX, roofY - 8 + bob);
                }
                for (const v of vehicles) drawVehicle(v);
                drawTrail();
                // skip exterior FG draw on the frame we just entered a building
                if (insideBldgIdx < 0) drawFG();

                if (nearDoorBldgIdx >= 0) {
                    drawPopup("ENTER to go inside", fgX - camX, groundY - 35);
                }

                drawHUD();
            }

            actionPressed = false;

            c.fillStyle = "rgba(255,255,255,0.3)"; c.font = "12px sans-serif"; c.textAlign = "center";
            if (insideBldgIdx < 0) {
                c.fillText("Tap/click to walk  \u2022  ENTER at doors  \u2022  \u2190\u2192 keys", w / 2, h - 8);
            } else {
                c.fillText("Tap/click to walk  \u2022  ENTER to interact  \u2022  ESC to go back", w / 2, h - 8);
            }

            raf = requestAnimationFrame(loop);
        }

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
            window.removeEventListener("keydown", kd);
            window.removeEventListener("keyup", ku);
            el.removeEventListener("click", canvasClick);
            el.removeEventListener("touchstart", canvasTouch);
            el.removeEventListener("mousemove", canvasMouseMove);
            el.removeEventListener("mouseleave", canvasMouseLeave);
        };
    }, []);

    // ── gas border effect ──
    useEffect(() => {
        const gel = gasRef.current;
        if (!gel) return;
        const gc = gel.getContext("2d");
        if (!gc) return;

        const pts: GasP[] = [];
        let gw = 1, gh = 1, gRaf = 0;

        function gResize() {
            const dpr = devicePixelRatio || 1;
            const r = gel!.getBoundingClientRect();
            gw = r.width; gh = r.height;
            gel!.width = Math.floor(gw * dpr);
            gel!.height = Math.floor(gh * dpr);
            gc!.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        gResize();
        window.addEventListener("resize", gResize);

        function spawn() {
            // ambient gas across the full section, drifting upward
            const px = Math.random() * gw;
            const py = gh * 0.3 + Math.random() * gh * 0.7; // bias toward bottom
            const pvx = (Math.random() - 0.5) * 0.4;
            const pvy = -rnd(0.2, 0.8);
            pts.push({
                x: px, y: py, vx: pvx, vy: pvy,
                r: rnd(12, 45), a: rnd(0.06, 0.18),
                life: 0, max: rnd(80, 180),
                color: pick(GAS_COLORS),
            });
        }

        function gLoop() {
            gc!.clearRect(0, 0, gw, gh);
            // spawn ~3 per frame
            for (let i = 0; i < 3; i++) if (pts.length < 200) spawn();

            gc!.globalCompositeOperation = "lighter";
            for (let i = pts.length - 1; i >= 0; i--) {
                const p = pts[i];
                p.life++; p.x += p.vx; p.y += p.vy;
                const t = p.life / p.max;
                const alpha = p.a * (1 - t);
                if (alpha <= 0 || p.life > p.max) { pts.splice(i, 1); continue; }
                const grad = gc!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (1 + t * 0.6));
                grad.addColorStop(0, `rgba(${p.color},${alpha})`);
                grad.addColorStop(1, `rgba(${p.color},0)`);
                gc!.fillStyle = grad;
                gc!.beginPath();
                gc!.arc(p.x, p.y, p.r * (1 + t * 0.6), 0, Math.PI * 2);
                gc!.fill();
            }
            gc!.globalCompositeOperation = "source-over";
            gRaf = requestAnimationFrame(gLoop);
        }
        gRaf = requestAnimationFrame(gLoop);

        return () => {
            cancelAnimationFrame(gRaf);
            window.removeEventListener("resize", gResize);
        };
    }, []);

    return (
        <section
            id="game"
            className="relative w-full bg-black flex flex-col items-center justify-center overflow-hidden"
            style={{ minHeight: "100vh" }}
        >
            {/* Full-screen gas background */}
            <canvas
                ref={gasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
            />
            {/* Content on top */}
            <div className="relative z-10 text-center pb-6">
                <h2 className="text-4xl sm:text-5xl font-black">
                    <span className="bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent">
                        FartGirl Shiller
                    </span>
                </h2>
                <p className="text-gray-400 mt-2 text-sm sm:text-base">Explore the city, find chads, shill $FARTGIRL!</p>
            </div>
            {/* Game card */}
            <div
                className="relative z-10 w-full"
                style={{
                    maxWidth: 1000,
                    padding: "0 12px",
                }}
            >
                <div
                    id="game-card"
                    className="relative overflow-hidden rounded-2xl"
                    style={{
                        border: "1px solid rgba(34,197,94,0.25)",
                        background: "linear-gradient(180deg, #0a0a1a 0%, #0d0d20 100%)",
                        boxShadow: "0 0 40px rgba(34,197,94,0.08), 0 4px 24px rgba(0,0,0,0.5)",
                        maxHeight: "calc(100vh - 120px)",
                    }}
                >
                    <canvas
                        ref={ref}
                        className="absolute inset-0 w-full h-full"
                        style={{ touchAction: "none", borderRadius: "inherit" }}
                        tabIndex={0}
                    />
                </div>
            </div>
            <style>{`
                #game-card {
                    aspect-ratio: 16 / 9;
                }
                @media (max-width: 1024px) {
                    #game-card {
                        aspect-ratio: 4 / 3;
                    }
                }
                @media (max-width: 768px) {
                    #game > div:last-child {
                        padding: 0 12px;
                    }
                    #game-card {
                        aspect-ratio: 9 / 16;
                        max-height: calc(100vh - 120px);
                        max-width: calc(100vw - 24px);
                    }
                }
            `}</style>
        </section>
    );
}
