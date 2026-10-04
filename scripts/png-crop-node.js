// 临时工具：PNG 裁剪 + 最近邻放大（纯 node，无依赖），用于量截图里的像素。
// 用法：node scripts/png-crop-node.js <in.png> <out.png> <x> <y> <w> <h> [scale]
const fs = require("fs");
const zlib = require("zlib");

const [inPath, outPath, xs, ys, ws, hs, scaleArg] = process.argv.slice(2);
const cx = Number(xs), cy = Number(ys), cw = Number(ws), ch = Number(hs);
const scale = Number(scaleArg || 1);

const buf = fs.readFileSync(inPath);
let pos = 8;
let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
const idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString("ascii", pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  if (type === "IHDR") {
    w = data.readUInt32BE(0); h = data.readUInt32BE(4);
    bitDepth = data[8]; colorType = data[9]; interlace = data[12];
  } else if (type === "IDAT") idat.push(data);
  else if (type === "IEND") break;
  pos += 12 + len;
}
if (bitDepth !== 8) throw new Error("only bit depth 8 supported, got " + bitDepth);
if (interlace !== 0) throw new Error("interlaced PNG not supported");
const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : -1;
if (channels < 0) throw new Error("unsupported color type " + colorType);

const raw = zlib.inflateSync(Buffer.concat(idat));
const stride = w * channels;
const img = Buffer.alloc(h * stride);
let rp = 0;
for (let y = 0; y < h; y++) {
  const filter = raw[rp++];
  const line = raw.subarray(rp, rp + stride);
  rp += stride;
  const cur = img.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? img.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
  for (let i = 0; i < stride; i++) {
    const a = i >= channels ? cur[i - channels] : 0;
    const b = prev[i];
    const c = i >= channels ? prev[i - channels] : 0;
    let v = line[i];
    if (filter === 1) v += a;
    else if (filter === 2) v += b;
    else if (filter === 3) v += (a + b) >> 1;
    else if (filter === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    cur[i] = v & 0xff;
  }
}

const outW = cw * scale, outH = ch * scale;
const oraw = Buffer.alloc(outH * (1 + outW * 4));
for (let y = 0; y < outH; y++) {
  const rs = y * (1 + outW * 4);
  for (let x = 0; x < outW; x++) {
    const sx = cx + Math.floor(x / scale), sy = cy + Math.floor(y / scale);
    const o = rs + 1 + x * 4;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
      o = o; oraw[o] = 255; oraw[o + 1] = 0; oraw[o + 2] = 255; oraw[o + 3] = 255;
      continue;
    }
    const i = (sy * w + sx) * channels;
    if (channels === 1) { const g = img[i]; oraw[o] = g; oraw[o + 1] = g; oraw[o + 2] = g; oraw[o + 3] = 255; }
    else { oraw[o] = img[i]; oraw[o + 1] = img[i + 1]; oraw[o + 2] = img[i + 2]; oraw[o + 3] = channels === 4 ? img[i + 3] : 255; }
  }
}

const crcTable = [];
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(b) { let c = 0xffffffff; for (const byte of b) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(outW, 0); ihdr.writeUInt32BE(outH, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(outPath, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(oraw)), chunk("IEND", Buffer.alloc(0)),
]));
console.log(`${inPath} ${w}x${h} -> crop(${cx},${cy},${cw},${ch}) x${scale} = ${outW}x${outH}`);
