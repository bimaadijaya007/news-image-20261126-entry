// THE WORLD IN ONE DAY — 26 November 2026
// A one-page newspaper front that sums up Thursday 26 November 2026 in a
// single 1024x1024 PNG. Everything is drawn programmatically: a hand-made
// 5x7 bitmap font, geometric pictograms, and a hand-rolled PNG encoder.
// Node stdlib only. Deterministic: two runs write identical bytes.
//
// Stories (all verified against 26 Nov 2026 news digests):
//  01 Houthis hit Ras Tanura refinery (Reuters, lead story of the day)
//  02 Two tankers hit mines in the Strait of Hormuz (Reuters)
//  03 Israel kills Hamas security chief in Gaza (Reuters)
//  04 Solomon Islands pick Australia over China in a security treaty
//  05 First Pakistani astronaut aboard China's Tiangong station
//  06 Mumbai remembers 26/11, 18 years on / Constitution Day in India
//  07 Russia's own figures: nearly 500,000 lost in the Ukraine war
//  08 Gukesh opens his world chess title defence vs Sindarov

import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const PAPER = [247, 242, 232];
const CARD = [255, 253, 246];
const INK = [22, 22, 22];
const RED = [179, 38, 30];
const NAVY = [20, 38, 74];
const GREEN = [29, 92, 51];
const DARKRED = [122, 26, 20];
const WHITE = [255, 255, 255];
const GREY = [90, 84, 72];

// ---------------------------------------------------------------- pixels
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  // Round first: a fractional row would shift pixels sideways by
  // frac(y) * W columns when the buffer index is computed, so every
  // coordinate must be an integer before indexing.
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
    }
  }
}

function frame(x: number, y: number, w: number, h: number, t: number, c: number[]): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function fillCircle(cx: number, cy: number, r: number, c: number[]): void {
  cx = Math.round(cx);
  cy = Math.round(cy);
  r = Math.round(r);
  for (let yy = cy - r; yy <= cy + r; yy++) {
    const dy = yy - cy;
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    fillRect(cx - dx, yy, dx * 2 + 1, 1, c);
  }
}

// Scanline polygon fill (points: [x, y] pairs, non-self-intersecting).
function poly(points: number[][], c: number[]): void {
  points = points.map((p) => [Math.round(p[0]), Math.round(p[1])]);
  let minY = H;
  let maxY = 0;
  for (const p of points) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(xs[k], y, xs[k + 1] - xs[k] + 1, 1, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits ("1" = filled). Own encoding, drawn from
// scratch for this page.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap into lines no wider than maxW.
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Tag chip: coloured block with white label.
function chip(x: number, y: number, label: string, scale: number, bg: number[]): number {
  const w = textWidth(label, scale) + 16;
  const h = 7 * scale + 10;
  fillRect(x, y, w, h, bg);
  drawText(x + 8, y + 5, label, scale, WHITE);
  return w;
}

// ---------------------------------------------------------------- icons
// Each pictogram is drawn inside a box (x, y, s) where s is its size.

function iconRefinery(x: number, y: number, s: number, c: number[]): void {
  // Three distillation towers with smoke drifting right.
  const u = s / 100;
  fillRect(x + 8 * u, y + 42 * u, 14 * u, 58 * u, c);
  fillRect(x + 30 * u, y + 28 * u, 16 * u, 72 * u, c);
  fillRect(x + 54 * u, y + 48 * u, 12 * u, 52 * u, c);
  poly(
    [
      [x + 8 * u, y + 42 * u],
      [x + 15 * u, y + 26 * u],
      [x + 22 * u, y + 42 * u],
    ],
    c,
  );
  poly(
    [
      [x + 30 * u, y + 28 * u],
      [x + 38 * u, y + 12 * u],
      [x + 46 * u, y + 28 * u],
    ],
    c,
  );
  fillCircle(x + 74 * u, y + 22 * u, 9 * u, c);
  fillCircle(x + 88 * u, y + 14 * u, 7 * u, c);
  fillCircle(x + 60 * u, y + 10 * u, 6 * u, c);
  fillRect(x, y + 100 * u, 100 * u, 4 * u, c);
}

function iconShipMine(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  poly(
    [
      [x + 6 * u, y + 58 * u],
      [x + 92 * u, y + 58 * u],
      [x + 80 * u, y + 82 * u],
      [x + 18 * u, y + 82 * u],
    ],
    c,
  );
  fillRect(x + 44 * u, y + 26 * u, 5 * u, 32 * u, c);
  fillRect(x + 30 * u, y + 26 * u, 40 * u, 4 * u, c);
  // Naval mine: spiked ball.
  fillCircle(x + 82 * u, y + 22 * u, 9 * u, RED);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const dx = Math.round(Math.cos(a) * 12 * u);
    const dy = Math.round(Math.sin(a) * 12 * u);
    fillRect(x + 82 * u + dx - 2, y + 22 * u + dy - 2, 4, 4, RED);
  }
  fillRect(x, y + 92 * u, 100 * u, 4 * u, c);
}

function iconBuildingBlast(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  fillRect(x + 10 * u, y + 40 * u, 34 * u, 60 * u, c);
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      fillRect(x + 16 * u + col * 10 * u, y + 48 * u + r * 14 * u, 5 * u, 6 * u, CARD);
    }
  }
  // Blast star.
  const cx = x + 72 * u;
  const cy = y + 34 * u;
  const pts: number[][] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2;
    const r = k % 2 === 0 ? 26 * u : 9 * u;
    pts.push([cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r)]);
  }
  poly(pts, RED);
  fillCircle(cx, cy, 6 * u, [255, 200, 60]);
}

function iconAnchor(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  fillCircle(x + 50 * u, y + 14 * u, 9 * u, c);
  fillCircle(x + 50 * u, y + 14 * u, 5 * u, CARD);
  fillRect(x + 47 * u, y + 22 * u, 6 * u, 52 * u, c);
  fillRect(x + 26 * u, y + 34 * u, 48 * u, 6 * u, c);
  poly(
    [
      [x + 22 * u, y + 52 * u],
      [x + 78 * u, y + 52 * u],
      [x + 72 * u, y + 78 * u],
      [x + 60 * u, y + 88 * u],
      [x + 40 * u, y + 88 * u],
      [x + 28 * u, y + 78 * u],
    ],
    c,
  );
  fillRect(x + 28 * u, y + 52 * u, 44 * u, 22 * u, CARD);
  // Two island dots above the anchor.
  fillCircle(x + 16 * u, y + 12 * u, 5 * u, GREEN);
  fillCircle(x + 86 * u, y + 20 * u, 4 * u, GREEN);
}

function iconRocket(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  // Space station ring on the left.
  fillCircle(x + 22 * u, y + 26 * u, 16 * u, c);
  fillCircle(x + 22 * u, y + 26 * u, 11 * u, CARD);
  fillRect(x + 2 * u, y + 22 * u, 12 * u, 8 * u, c);
  fillRect(x + 32 * u, y + 22 * u, 12 * u, 8 * u, c);
  // Rocket on the right.
  poly(
    [
      [x + 66 * u, y + 8 * u],
      [x + 76 * u, y + 28 * u],
      [x + 56 * u, y + 28 * u],
    ],
    c,
  );
  fillRect(x + 56 * u, y + 28 * u, 20 * u, 40 * u, c);
  poly(
    [
      [x + 56 * u, y + 56 * u],
      [x + 44 * u, y + 78 * u],
      [x + 56 * u, y + 68 * u],
    ],
    c,
  );
  poly(
    [
      [x + 76 * u, y + 56 * u],
      [x + 88 * u, y + 78 * u],
      [x + 76 * u, y + 68 * u],
    ],
    c,
  );
  poly(
    [
      [x + 61 * u, y + 68 * u],
      [x + 71 * u, y + 68 * u],
      [x + 66 * u, y + 88 * u],
    ],
    RED,
  );
  fillCircle(x + 66 * u, y + 42 * u, 5 * u, CARD);
}

function iconCandleGate(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  // Memorial candle.
  fillRect(x + 20 * u, y + 42 * u, 12 * u, 46 * u, c);
  poly(
    [
      [x + 26 * u, y + 22 * u],
      [x + 33 * u, y + 36 * u],
      [x + 19 * u, y + 36 * u],
    ],
    RED,
  );
  fillRect(x + 12 * u, y + 88 * u, 28 * u, 5 * u, c);
  // Gateway arch.
  fillRect(x + 56 * u, y + 40 * u, 10 * u, 53 * u, c);
  fillRect(x + 84 * u, y + 40 * u, 10 * u, 53 * u, c);
  fillRect(x + 56 * u, y + 34 * u, 38 * u, 10 * u, c);
  poly(
    [
      [x + 56 * u, y + 34 * u],
      [x + 75 * u, y + 14 * u],
      [x + 94 * u, y + 34 * u],
    ],
    c,
  );
}

function iconBars(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  const heights = [26, 40, 58, 74, 88];
  for (let i = 0; i < 5; i++) {
    const h = heights[i] * u;
    fillRect(x + (8 + i * 18) * u, y + 96 * u - h, 12 * u, h, i === 4 ? RED : c);
  }
  fillRect(x, y + 96 * u, 100 * u, 4 * u, c);
  fillRect(x, y + 4 * u, 4 * u, 96 * u, c);
}

function iconKing(x: number, y: number, s: number, c: number[]): void {
  const u = s / 100;
  // Chess king: cross, crown, body, base.
  fillRect(x + 46 * u, y + 4 * u, 8 * u, 22 * u, c);
  fillRect(x + 38 * u, y + 11 * u, 24 * u, 7 * u, c);
  poly(
    [
      [x + 34 * u, y + 30 * u],
      [x + 66 * u, y + 30 * u],
      [x + 62 * u, y + 48 * u],
      [x + 38 * u, y + 48 * u],
    ],
    c,
  );
  poly(
    [
      [x + 42 * u, y + 48 * u],
      [x + 58 * u, y + 48 * u],
      [x + 66 * u, y + 76 * u],
      [x + 34 * u, y + 76 * u],
    ],
    c,
  );
  fillRect(x + 28 * u, y + 76 * u, 44 * u, 8 * u, c);
  fillRect(x + 22 * u, y + 84 * u, 56 * u, 8 * u, c);
}

// ---------------------------------------------------------------- layout
const MX = 16; // page margin

// Masthead
drawTextCentered(512, 10, "THE WORLD IN ONE DAY", 6, INK);
fillRect(MX, 96, W - 2 * MX, 4, RED);
fillRect(MX, 104, W - 2 * MX, 2, RED);
drawTextCentered(
  512,
  66,
  "THURSDAY - 26 NOVEMBER 2026  .  8 STORIES  .  PRICE: ONE DAY",
  2,
  GREY,
);

// Lead story 01 — dark red panel.
fillRect(MX, 130, W - 2 * MX, 222, DARKRED);
drawText(MX + 20, 152, "01", 8, WHITE);
chip(MX + 150, 152, "MIDDLE EAST", 2, RED);
drawText(MX + 150, 196, "HOUTHIS HIT RAS TANURA", 4, WHITE);
drawText(MX + 150, 236, "REFINERY", 4, WHITE);
const leadDeck = wrap(
  "SAUDI'S LARGEST REFINERY CLAIMED HIT - BRENT TOPS 93 AS SMOKE SEEN FROM SPACE",
  2,
  620,
);
leadDeck.forEach((ln, i) => drawText(MX + 150, 292 + i * 20, ln, 2, [240, 220, 210]));
iconRefinery(800, 168, 150, WHITE);
drawText(MX + 150, 330, "REUTERS - 25 NOV", 2, [220, 180, 170]);

// Grid cards 02-07.
interface Card {
  num: string;
  tag: string;
  tagBg: number[];
  head: string;
  deck: string;
  icon: (x: number, y: number, s: number, c: number[]) => void;
}
const cards: Card[] = [
  {
    num: "02",
    tag: "GULF SHIPPING",
    tagBg: NAVY,
    head: "TWO TANKERS HIT MINES IN HORMUZ",
    deck: "IRGC SAYS MINES SET TANKERS ABLAZE - TRADE ROUTE ON EDGE",
    icon: iconShipMine,
  },
  {
    num: "03",
    tag: "GAZA",
    tagBg: RED,
    head: "ISRAEL KILLS HAMAS SECURITY CHIEF",
    deck: "SECOND HAMAS OFFICIAL SLAIN IN 24 HOURS - CEASEFIRE STRAINS",
    icon: iconBuildingBlast,
  },
  {
    num: "04",
    tag: "PACIFIC",
    tagBg: GREEN,
    head: "SOLOMONS PICK AUSTRALIA OVER CHINA",
    deck: "HISTORIC TREATY MAKES CANBERRA TOP SECURITY PARTNER",
    icon: iconAnchor,
  },
  {
    num: "05",
    tag: "SPACE",
    tagBg: NAVY,
    head: "FIRST PAKISTANI ASTRONAUT ABOARD TIANGONG",
    deck: "SHENZHOU-24 CREW DOCK - FIRST FOREIGNER ON CHINA STATION",
    icon: iconRocket,
  },
  {
    num: "06",
    tag: "INDIA",
    tagBg: RED,
    head: "MUMBAI REMEMBERS 26/11, 18 YEARS ON",
    deck: "CONSTITUTION DAY MARKS 77 YEARS OF THE SAMVIDHAN",
    icon: iconCandleGate,
  },
  {
    num: "07",
    tag: "UKRAINE WAR",
    tagBg: NAVY,
    head: "RUSSIA LOST NEARLY 500,000 IN WAR",
    deck: "MOSCOW'S OWN FIGURES COUNT THE DEAD AFTER NEARLY 5 YEARS",
    icon: iconBars,
  },
];

const CW = 490;
const CH = 156;
const CGAP = 12;
const GY0 = 364;
cards.forEach((card, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = MX + col * (CW + CGAP);
  const y = GY0 + row * (CH + CGAP);
  fillRect(x, y, CW, CH, CARD);
  frame(x, y, CW, CH, 2, INK);
  drawText(x + 14, y + 12, card.num, 3, RED);
  chip(x + 14 + textWidth(card.num, 3) + 14, y + 12, card.tag, 2, card.tagBg);
  const headLines = wrap(card.head, 3, CW - 28 - 96);
  headLines.slice(0, 2).forEach((ln, j) => drawText(x + 14, y + 48 + j * 29, ln, 3, INK));
  const deckLines = wrap(card.deck, 2, CW - 28 - 96);
  deckLines.slice(0, 2).forEach((ln, j) => drawText(x + 14, y + 110 + j * 18, ln, 2, GREY));
  card.icon(x + CW - 96, y + 34, 78, INK);
});

// Sport strip 08.
fillRect(MX, 868, W - 2 * MX, 84, GREEN);
drawText(MX + 18, 880, "08", 5, WHITE);
drawText(MX + 18, 922, "SPORT", 2, [200, 230, 205]);
drawText(MX + 132, 882, "GUKESH OPENS WORLD CHESS TITLE DEFENCE", 3, WHITE);
drawText(MX + 132, 920, "INDIA'S CHAMPION FACES SINDAROV FOR THE CROWN", 2, [215, 235, 220]);
iconKing(908, 876, 68, WHITE);

// Footer.
fillRect(MX, 958, W - 2 * MX, 2, INK);
drawTextCentered(
  512,
  972,
  "26 NOVEMBER 2026 - CONSTITUTION DAY IN INDIA - 18 YEARS SINCE 26/11",
  2,
  INK,
);

// ---------------------------------------------------------------- PNG write
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}/entry.png`;
writeFileSync(outPath, png);
console.log(
  `wrote ${outPath} ${png.length} bytes sha256=${createHash("sha256").update(png).digest("hex")}`,
);
