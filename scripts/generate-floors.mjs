// Generate floors.png — 7 grayscale 16x16 tile patterns (112 x 16 horizontal strip)
// Uses pngjs from server workspace
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

const TILE_SIZE = 16;
const TILE_COUNT = 7;
const WIDTH = TILE_SIZE * TILE_COUNT;
const HEIGHT = TILE_SIZE;

const png = new PNG({ width: WIDTH, height: HEIGHT });

// Helper: set pixel at (x, y) to grayscale value v (0-255)
function setPixel(x, y, v) {
  const idx = (y * WIDTH + x) * 4;
  png.data[idx] = v;
  png.data[idx + 1] = v;
  png.data[idx + 2] = v;
  png.data[idx + 3] = 255;
}

// Pattern 0: Solid — uniform gray
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    setPixel(x, y, 128);
  }
}

// Pattern 1: Checkerboard (2x2)
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const check = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) ? 140 : 115;
    setPixel(TILE_SIZE + x, y, check);
  }
}

// Pattern 2: Horizontal stripes
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const v = (y % 4 < 2) ? 135 : 120;
    setPixel(TILE_SIZE * 2 + x, y, v);
  }
}

// Pattern 3: Diagonal
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const v = ((x + y) % 4 < 2) ? 138 : 118;
    setPixel(TILE_SIZE * 3 + x, y, v);
  }
}

// Pattern 4: Large checkerboard (4x4)
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const check = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0) ? 142 : 112;
    setPixel(TILE_SIZE * 4 + x, y, check);
  }
}

// Pattern 5: Small dots (every 4px)
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const isDot = (x % 4 === 0 && y % 4 === 0);
    setPixel(TILE_SIZE * 5 + x, y, isDot ? 150 : 125);
  }
}

// Pattern 6: Cross-hatch
for (let y = 0; y < TILE_SIZE; y++) {
  for (let x = 0; x < TILE_SIZE; x++) {
    const isLine = (x % 4 === 0 || y % 4 === 0);
    setPixel(TILE_SIZE * 6 + x, y, isLine ? 145 : 118);
  }
}

// Write to client/public/assets/floors.png
const outDir = path.resolve(import.meta.dirname, '..', 'client', 'public', 'assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'floors.png');
const buffer = PNG.sync.write(png);
fs.writeFileSync(outPath, buffer);
console.log(`Generated ${outPath} (${WIDTH}x${HEIGHT}, ${TILE_COUNT} tiles)`);
