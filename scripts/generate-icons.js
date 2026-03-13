#!/usr/bin/env node
// アイコン画像を生成するスクリプト
// 依存: canvas (npm install canvas --save-dev)
// 代替: sharp なしで純粋なPNGバイナリを手動生成

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');
mkdirSync(iconsDir, { recursive: true });

const SIZES = [16, 48, 128];

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#0969da';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.18);
  ctx.fill();

  // "M" テキスト
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(iconsDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}
