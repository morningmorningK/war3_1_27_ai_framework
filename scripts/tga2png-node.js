// 临时工具：把无压缩/ RLE 的 32/24 位 TGA 转成 PNG，方便直接看图。
// 用法：node scripts/tga2png-node.js <in.tga> <out.png> [scale]
// 只支持 imgtype 2（无压缩真彩）和 10（RLE 真彩），本项目 UI 素材只用到这两种。
const fs = require("fs");
const zlib = require("zlib");

const [inPath, outPath, scaleArg] = process.argv.slice(2);
const scale = Number(scaleArg || 1);

const b = fs.readFileSync(inPath);
const imgType = b[2];
const w = b.readUInt16LE(12);
const h = b.readUInt16LE(14);
const bpp = b[16];
const desc = b[17];
const topLeft = (desc & 0x20) !== 0;
const bytesPP = bpp / 8;

let off = 18 + b[0];
const px = Buffer.alloc(w * h * bytesPP);

if (imgType === 2) {
  b.copy(px, 0, off, off + px.length);
  off += px.length;
} else if (imgType === 10) {
  let n = 0;
  while (n < w * h) {
    const head = b[off++];
    const count = (head & 0x7f) + 1;
    if (head & 0x80) {
      const p = b.subarray(off, off + bytesPP);
      off += bytesPP;
      for (let i = 0; i < count; i++) p.copy(px, (n++) * bytesPP);
    } else {
      for (let i = 0; i < count; i++) {
        b.copy(px, (n++) * bytesPP, off, off + bytesPP);
        off += bytesPP;
      }
    }
  }
} else {
  throw new Error("unsupported imgtype " + imgType);
}

// TGA 的像素是 BGRA，alpha 在最高字节
function pixel(x, y) {
  const srcY = topLeft ? y : h - 1 - y;
  const i = (srcY * w + x) * bytesPP;
  return [px[i + 2], px[i + 1], px[i], bytesPP === 4 ? px[i + 3] : 255];
}

// 放大用最近邻，alpha 为 0 的地方画成品红，方便看出透明区
const outW = w * scale;
const outH = h * scale;
const raw = Buffer.alloc(outH * (1 + outW * 4));
for (let y = 0; y < outH; y++) {
  const rowStart = y * (1 + outW * 4);
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < outW; x++) {
    const [r, g, bl, a] = pixel(Math.floor(x / scale), Math.floor(y / scale));
    const o = rowStart + 1 + x * 4;
    if (a === 0) {
      raw[o] = 255; raw[o + 1] = 0; raw[o + 2] = 255; raw[o + 3] = 255;
    } else {
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = bl; raw[o + 3] = a;
    }
  }
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(outW, 0);
ihdr.writeUInt32BE(outH, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);
fs.writeFileSync(outPath, png);
console.log(`${inPath} ${w}x${h} (${imgType === 10 ? "RLE" : "raw"}) -> ${outPath} ${outW}x${outH}`);
