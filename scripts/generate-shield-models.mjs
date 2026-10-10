/** Derivatives of Sacred Guard Classic by Vinz. Original imports remain untouched.
 * MDX 800 layout reference: flowtsohg/mdx-m3-viewer, parsers/mdlx.
 * Run from the repository root: node scripts/generate-shield-models.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourceDir = path.join(root, "maps/resource/war3mapImported");
const source = fs.readFileSync(path.join(resourceDir, "Sacred Guard Gold - Classic.mdx"));
// Resource alpha, including animated values, rather than attached-effect vertex alpha.
const materialAlpha = 0.45;
const palettes = {
  Fire: "FF5938", Water: "2874FF", Ice: "58DFFF", Thunder: "9F40FF",
  Wind: "16C6B0", Rock: "FFA52E", Grass: "64CF24", None: "D8DFEA",
};

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function chunks(buffer) {
  check(buffer.toString("ascii", 0, 4) === "MDLX", "Expected MDX model");
  const result = [];
  let cursor = 4;
  while (cursor < buffer.length) {
    check(cursor + 8 <= buffer.length, "Truncated chunk header");
    const size = buffer.readUInt32LE(cursor + 4);
    const end = cursor + 8 + size;
    check(end <= buffer.length, "Truncated model chunk");
    result.push({ tag: buffer.toString("ascii", cursor, cursor + 4), start: cursor + 8, end });
    cursor = end;
  }
  return result;
}

function records(buffer, start, end, minimum, visit) {
  let cursor = start;
  while (cursor < end) {
    const size = buffer.readUInt32LE(cursor);
    check(size >= minimum && cursor + size <= end, "Invalid MDX record size");
    visit(cursor, cursor + size);
    cursor += size;
  }
  check(cursor === end, "Misaligned MDX records");
}

function tracks(buffer, start, end, visit) {
  let cursor = start;
  while (cursor < end) {
    check(cursor + 16 <= end, "Truncated track header");
    const tag = buffer.toString("ascii", cursor, cursor + 4);
    const count = buffer.readUInt32LE(cursor + 4);
    const interpolation = buffer.readUInt32LE(cursor + 8);
    check(["KGAO", "KGAC", "KMTA", "KMTF"].includes(tag), `Unsupported track ${tag}`);
    check(interpolation <= 3, "Invalid track interpolation");
    const dimensions = tag === "KGAC" ? 3 : 1;
    const valuesPerKey = interpolation > 1 ? 3 : 1;
    const stride = 4 + dimensions * 4 * valuesPerKey;
    const trackEnd = cursor + 16 + count * stride;
    check(trackEnd <= end, "Truncated track values");
    for (let key = cursor + 16; key < trackEnd; key += stride) {
      for (let value = 0; value < valuesPerKey; value++) {
        visit(tag, key + 4 + value * dimensions * 4, dimensions);
      }
    }
    cursor = trackEnd;
  }
}

const sourceChunks = chunks(source);
const version = sourceChunks.find(chunk => chunk.tag === "VERS");
check(version && source.readUInt32LE(version.start) === 800, "Only Classic MDX 800 is supported");
check(!sourceChunks.some(chunk => ["PREM", "PRE2", "RIBB"].includes(chunk.tag)),
  "Particle/ribbon emitters need separate color handling");

for (const [name, hex] of Object.entries(palettes)) {
  const buffer = Buffer.from(source);
  const rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  let layers = 0;
  let geosets = 0;
  function tint(offset) {
    const original = [0, 1, 2].map(i => buffer.readFloatLE(offset + i * 4));
    // Keep the original black backing; color the ring, rays, and pale highlights.
    if (original.every(channel => channel === 0)) return;
    const highlight = Math.min(...original) > 0.95;
    const brightness = Math.max(...original);
    for (let i = 0; i < 3; i++) {
      // Most highlights used to be 65% white, making all eight rings look alike.
      buffer.writeFloatLE((highlight ? 0.12 + rgb[i] * 0.88 : rgb[i]) * brightness, offset + i * 4);
    }
  }
  for (const chunk of sourceChunks) {
    if (chunk.tag === "MTLS") {
      records(buffer, chunk.start, chunk.end, 20, (material, end) => {
        check(buffer.toString("ascii", material + 12, material + 16) === "LAYS", "Missing layer block");
        const count = buffer.readUInt32LE(material + 16);
        let seen = 0;
        records(buffer, material + 20, end, 28, (layer, layerEnd) => {
          // Additive ignores alpha on some renderers; AddAlpha respects material alpha.
          if (buffer.readUInt32LE(layer + 4) === 3) buffer.writeUInt32LE(4, layer + 4);
          buffer.writeFloatLE(buffer.readFloatLE(layer + 24) * materialAlpha, layer + 24);
          tracks(buffer, layer + 28, layerEnd, (tag, offset) => {
            if (tag === "KMTA") buffer.writeFloatLE(buffer.readFloatLE(offset) * materialAlpha, offset);
          });
          seen++;
          layers++;
        });
        check(seen === count, "Layer count mismatch");
      });
    } else if (chunk.tag === "GEOA") {
      records(buffer, chunk.start, chunk.end, 28, (animation, end) => {
        tint(animation + 12);
        tracks(buffer, animation + 28, end, (tag, offset) => {
          if (tag === "KGAC") tint(offset);
        });
        geosets++;
      });
    }
  }
  check(layers > 0 && geosets > 0, "No editable shield materials/colors");
  // Animation times, visibility tracks, geometry, and texture paths retain their bytes.
  check(buffer.length === source.length, "Model size changed unexpectedly");
  const filename = `Shield Pale ${name}.mdx`;
  fs.writeFileSync(path.join(resourceDir, filename), buffer);
  console.log(`${filename}: ${layers} layers, ${geosets} geoset colors, alpha ${materialAlpha}, #${hex}`);
}
