// 生成等级数字框用的两张贴图（纯 node，无依赖）。
//
//   Texture\ui\hpbar\levelbox.tga —— 从 01.tga 里切下**左边那个小格子**（等级框）
//   Texture\ui\hpbar\levelmask.tga —— 一块纯黑，用来盖掉烘焙在 01.tga 里的分隔线
//
// 为什么不用 `DzFrameSetTexCoord` 从 01.tga 现场裁：
//   那个函数的参数顺序（left/top/right/bottom 还是 left/right/top/bottom）在 1.27a
//   的 .j 声明里和暴雪 fdf 的写法对不上，猜错就是一张零宽贴图，只能进游戏才知道。
//   切成独立文件则连**尺寸**都是确定的，且与本项目已有的 health/blp 做法一致。
//
// 01.tga 的实测几何（140x28，32 位无压缩，desc=0x08 即左下原点）：
//   x 0..1 透明外边距 | x 2..3 左边框 | x 4..23 格子内部 | x 24..25 分隔线
//   y 2..3 上边框 | y 4..23 内部 | y 24..25 下边框
//
// 用法：node scripts/make-levelbox.js
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "maps", "resource", "Texture", "ui", "hpbar");
const SRC = path.join(DIR, "01.tga");

const src = fs.readFileSync(SRC);
const W = src.readUInt16LE(12);
const H = src.readUInt16LE(14);
const OFF = 18 + src[0];
if (src[2] !== 2 || src[16] !== 32) {
  throw new Error("01.tga 不是 32 位无压缩 TGA，裁剪假设不成立");
}

/** 写一个 32 位无压缩 TGA。rows 是按文件顺序（左下原点）逐行的 BGRA 字节。 */
function writeTga(file, w, h, rows) {
  const head = Buffer.alloc(18);
  head[2] = 2; // 无压缩真彩
  head.writeUInt16LE(w, 12);
  head.writeUInt16LE(h, 14);
  head[16] = 32;
  head[17] = 0x08; // 8 位 alpha + 左下原点，与 01.tga 一致
  fs.writeFileSync(file, Buffer.concat([head, ...rows]));
}

// levelbox：逐行照抄最左边 26 个像素（x 0..25，即「左边框 + 内部 + 分隔线」）。
// 直接按文件行序复制，不翻转 —— 与源图同样的 desc，方向必然一致。
const CUT_W = 26;
const boxRows = [];
for (let r = 0; r < H; r++) {
  const start = OFF + r * W * 4;
  boxRows.push(Buffer.from(src.subarray(start, start + CUT_W * 4)));
}
writeTga(path.join(DIR, "levelbox.tga"), CUT_W, H, boxRows);

// levelmask：纯黑不透明。开 16x16 而不是 1x1，避开引擎对贴图最小尺寸的限制
// （KKWE 里专门有个 DzUnlockBlpSizeLimit 就说明这类限制是真实存在的）。
const M = 16;
const blackRow = Buffer.alloc(M * 4);
for (let i = 0; i < M * 4; i += 4) {
  blackRow[i] = 0;
  blackRow[i + 1] = 0;
  blackRow[i + 2] = 0;
  blackRow[i + 3] = 255;
}
writeTga(path.join(DIR, "levelmask.tga"), M, M, new Array(M).fill(blackRow));

console.log(`levelbox.tga ${CUT_W}x${H}（01.tga 的 x0..25 全高）`);
console.log(`levelmask.tga ${M}x${M} 纯黑`);
