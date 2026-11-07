#!/usr/bin/env node
/* Validate downloaded Drive v6p part PNGs + metadata, copy into site/media/v6p/. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const inputDir = path.resolve(process.argv[2] || "");
const repoRoot = path.resolve(arg("--root", defaultRoot));
if (!process.argv[2] || !fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
  console.error("Usage: node tools/sync-v6p-from-drive.mjs <downloaded-folder> [--root <repo>]");
  process.exit(2);
}

const catalog = (await import(pathToFileURL(path.join(repoRoot, "site/v6p-part-catalog.js")).href)).default
  || (await import(pathToFileURL(path.join(repoRoot, "site/v6p-part-catalog.js")).href));
const C = catalog.PARTS ? catalog : catalog;

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function readMeta(pngPath, index) {
  const candidates = [
    pngPath + ".meta.json",
    pngPath.replace(/\.png$/i, ".meta.json"),
    pngPath.replace(/\.png$/i, ".json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && !c.endsWith(".pixel-edits.json")) {
      try { return JSON.parse(fs.readFileSync(c, "utf8")); } catch { /* ignore */ }
    }
  }
  const base = path.basename(pngPath);
  if (index && index[base]) return index[base];
  return null;
}

function propsOf(meta) {
  if (!meta || typeof meta !== "object") return {};
  return meta.appProperties && typeof meta.appProperties === "object" ? meta.appProperties : meta;
}

function parsePngRgba(buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(sig)) throw new Error("Not a PNG");
  let off = 8, width = 0, height = 0, depth = 0, color = -1;
  const idat = [];
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.subarray(off, off + 4).toString("binary"); off += 4;
    const data = buf.subarray(off, off + len); off += len;
    off += 4; // crc
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      color = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (width !== C.W || height !== C.H) throw new Error(`size ${width}x${height}, expected ${C.W}x${C.H}`);
  if (depth !== 8 || color !== 6) throw new Error(`PNG must be 8-bit RGBA (got depth=${depth} colorType=${color})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = width * bpp, row = stride + 1;
  if (raw.length !== height * row) throw new Error("Unexpected inflated PNG size");
  const out = Buffer.alloc(width * height * 4);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * row];
    const src = raw.subarray(y * row + 1, y * row + row);
    const dest = out.subarray(y * stride, y * stride + stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? dest[i - bpp] : 0;
      const up = prev ? prev[i] : 0;
      const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (filter === 1) v = (v + left) & 255;
      else if (filter === 2) v = (v + up) & 255;
      else if (filter === 3) v = (v + ((left + up) >> 1)) & 255;
      else if (filter === 4) v = (v + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error("Unsupported PNG filter " + filter);
      dest[i] = v;
    }
  }
  let alpha = false;
  for (let i = 3; i < out.length; i += 4) if (out[i] > 0) { alpha = true; break; }
  return { width, height, alpha };
}

const mediaRoot = path.join(repoRoot, "site/media/v6p");
const files = walk(inputDir).filter(f => f.toLowerCase().endsWith(".png") && path.basename(f).startsWith("v6p--"));
let index = null;
const indexPath = path.join(inputDir, "metadata.json");
if (fs.existsSync(indexPath)) {
  const raw = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (Array.isArray(raw)) {
    index = Object.fromEntries(raw.map(x => [x.name, x]));
  } else if (raw && typeof raw === "object") index = raw;
}

const changed = [];
const errors = [];
for (const pngPath of files.sort()) {
  const name = path.basename(pngPath);
  try {
    const part = C.parseFilename(name);
    if (!part) throw new Error("filename is not a whitelisted v6p part");
    if (!fs.existsSync(path.join(mediaRoot, part + ".png"))) throw new Error("whitelist miss (file absent under site/media/v6p/): " + part);
    const bytes = fs.readFileSync(pngPath);
    const sha = crypto.createHash("sha256").update(bytes).digest("hex");
    const meta = readMeta(pngPath, index);
    if (!meta) throw new Error("missing metadata JSON (expected " + name + ".meta.json with appProperties)");
    const props = propsOf(meta);
    if (props.app && props.app !== "mahluk") throw new Error("appProperties.app must be mahluk");
    if (props.kind && props.kind !== "v6pPart") throw new Error("appProperties.kind must be v6pPart");
    if (props.part && props.part !== part) throw new Error("appProperties.part mismatch: " + props.part);
    if (props.width && String(props.width) !== String(C.W)) throw new Error("appProperties.width mismatch");
    if (props.height && String(props.height) !== String(C.H)) throw new Error("appProperties.height mismatch");
    if (!props.sha256) throw new Error("appProperties.sha256 missing");
    if (String(props.sha256).toLowerCase() !== sha) throw new Error("sha256 mismatch (file " + sha + " meta " + props.sha256 + ")");
    const info = parsePngRgba(bytes);
    if (!info.alpha) throw new Error("alpha channel is empty");
    const dest = path.join(mediaRoot, part + ".png");
    const prev = fs.readFileSync(dest);
    if (crypto.createHash("sha256").update(prev).digest("hex") === sha) {
      console.log("unchanged", part);
      continue;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = dest + ".bak-" + stamp;
    fs.copyFileSync(dest, bak);
    fs.copyFileSync(pngPath, dest);
    changed.push(part);
    console.log("updated", part, "->", path.relative(repoRoot, dest), "(backup " + path.basename(bak) + ")");
  } catch (e) {
    errors.push(name + ": " + e.message);
    console.error("ERROR", name, e.message);
  }
}

console.log("changed:", changed.length ? changed.join("\nchanged: ") : "(none)");
if (errors.length) {
  console.error("failed:", errors.length);
  process.exit(1);
}
