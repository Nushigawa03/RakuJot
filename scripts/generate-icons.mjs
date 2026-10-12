// public/icon.svg から各種アイコン画像を生成する
// 使い方: npm run icons
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/icon.svg";
const svg = await readFile(SRC, "utf8");

// 角丸クリップを外して背景を全面に敷いた版（iOS / maskable は OS 側で角を丸めるため）
const fullBleed = svg.replace(/\s*clip-path="url\(#bg\)"/, "");

// maskable 用: 背景は全面、前景はセーフゾーン（中心から半径40%）に収まるよう縮小
const MASKABLE_SCALE = 0.8;
const offset = (512 * (1 - MASKABLE_SCALE)) / 2;
const maskable = fullBleed
  .replace(/(<!-- メモ帳 -->)/, `<g transform="translate(${offset} ${offset}) scale(${MASKABLE_SCALE})">$1`)
  .replace(/<\/svg>\s*$/, "</g></svg>\n");

if (fullBleed === svg || !maskable.includes("scale(")) {
  throw new Error("icon.svg の構造が想定と違います（clip-path / メモ帳コメントが見つかりません）");
}

const png = (source, size) =>
  sharp(Buffer.from(source), { density: (72 * size) / 512 * 4 })
    .resize(size, size)
    .png()
    .toBuffer();

const outputs = [
  ["public/icon-192.png", svg, 192],
  ["public/icon-512.png", svg, 512],
  ["public/icon-maskable-192.png", maskable, 192],
  ["public/icon-maskable-512.png", maskable, 512],
  ["public/apple-touch-icon.png", fullBleed, 180],
];
for (const [path, source, size] of outputs) {
  await writeFile(path, await png(source, size));
  console.log(`✓ ${path}`);
}

// favicon.ico（PNG 埋め込み形式, 16/32/48）
const icoSizes = [16, 32, 48];
const images = await Promise.all(icoSizes.map((s) => png(svg, s)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
const entries = [];
let dataOffset = 6 + 16 * images.length;
images.forEach((img, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0);
  e.writeUInt8(icoSizes[i], 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(img.length, 8);
  e.writeUInt32LE(dataOffset, 12);
  dataOffset += img.length;
  entries.push(e);
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...entries, ...images]));
console.log("✓ public/favicon.ico");
