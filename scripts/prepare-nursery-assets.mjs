#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

const WIDTH = 388;
const HEIGHT = 338;
const DOOR = { x: 292, y: 230, width: 64, height: 104 };
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return output;
}

function readPNG(path) {
  const file = readFileSync(path);
  if (!file.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${path} is not a PNG`);
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let interlace = 0;
  const compressed = [];
  for (let offset = 8; offset < file.length;) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colourType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') compressed.push(data);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || colourType !== 6 || interlace !== 0) {
    throw new Error(`${path} must be an 8-bit, non-interlaced RGBA PNG (found depth ${bitDepth}, type ${colourType}, interlace ${interlace})`);
  }
  const filtered = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[input++];
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[input++];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const above = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const prediction = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? above
            : filter === 3 ? Math.floor((left + above) / 2)
              : filter === 4 ? paeth(left, above, upperLeft)
                : (() => { throw new Error(`Unsupported PNG filter ${filter}`); })();
      pixels[y * stride + x] = (raw + prediction) & 0xff;
    }
  }
  return { width, height, pixels };
}

function writePNG(path, image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = image.width * 4;
  const rows = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) image.pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  writeFileSync(path, Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

function transform(r, g, b, a, palette) {
  if (a <= 8) return [0, 0, 0, 0];
  if (palette === 'colour') return [r, g, b, a];
  if (palette === 'grayscale') {
    const luminance = Math.round((r * 299 + g * 587 + b * 114) / 1000);
    return [luminance, luminance, luminance, a];
  }
  const brightness = Math.max(r, g, b);
  if (brightness < 26) return [2, 8, 2, a];
  const intensity = Math.max(45, Math.min(255, brightness));
  return [Math.round(intensity * 16 / 255), intensity, Math.round(intensity * 31 / 255), a];
}

function blitNearest(source, destination, region, palette) {
  for (let y = 0; y < region.to.height; y += 1) {
    const sy = region.from.y + Math.min(region.from.height - 1, Math.floor(y * region.from.height / region.to.height));
    const dy = region.to.y + y;
    for (let x = 0; x < region.to.width; x += 1) {
      const sx = region.from.x + Math.min(region.from.width - 1, Math.floor(x * region.from.width / region.to.width));
      const dx = region.to.x + x;
      if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height || dx < 0 || dy < 0 || dx >= destination.width || dy >= destination.height) continue;
      const sourceOffset = (sy * source.width + sx) * 4;
      const destinationOffset = (dy * destination.width + dx) * 4;
      const pixel = transform(source.pixels[sourceOffset], source.pixels[sourceOffset + 1], source.pixels[sourceOffset + 2], source.pixels[sourceOffset + 3], palette);
      if (pixel[3] <= destination.pixels[destinationOffset + 3]) continue;
      destination.pixels.set(pixel, destinationOffset);
    }
  }
}

function clearRect(image, rect) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) image.pixels.fill(0, (y * image.width + x) * 4, (y * image.width + x + 1) * 4);
  }
}

function removeBakedNurserySign(image, postBottom) {
  // The separately mapped signboard is deliberately omitted. Remove the
  // source artwork's off-centre post from the lower facade mapping and restore
  // the covered roof/window/transparent pixels from the adjacent clean strip.
  // This keeps the production PNG sign-free while preserving its footprint.
  clearRect(image, { x: 0, y: 0, width: WIDTH, height: 112 });
  // The bottom pixels of the source board overlap the mapped roof by a few
  // rows. Replace that band from an intact section of the same roof (or from
  // transparent space in the vacant lot) rather than leaving a clipped tab.
  for (let y = 112; y < 132; y += 1) {
    for (let x = 70; x < 190; x += 1) {
      const sourceX = 198 + (x - 70);
      const sourceOffset = (y * image.width + sourceX) * 4;
      const destinationOffset = (y * image.width + x) * 4;
      image.pixels.copy(image.pixels, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
  for (let y = 112; y < postBottom; y += 1) {
    for (let x = 116; x < 143; x += 1) {
      const sourceX = 150 + (x - 116);
      const sourceOffset = (y * image.width + sourceX) * 4;
      const destinationOffset = (y * image.width + x) * 4;
      image.pixels.copy(image.pixels, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

function validate(image, palette, name) {
  if (image.width !== WIDTH || image.height !== HEIGHT) throw new Error(`${name} has invalid dimensions`);
  let transparent = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const [r, g, b, a] = image.pixels.subarray(offset, offset + 4);
      if (a === 0) transparent += 1;
      if (x >= DOOR.x && x < DOOR.x + DOOR.width && y >= DOOR.y && y < DOOR.y + DOOR.height && a !== 0) throw new Error(`${name} has an opaque door pixel at ${x},${y}`);
      if (palette === 'grayscale' && a > 0 && (r !== g || g !== b)) throw new Error(`${name} contains coloured pixels`);
      if (palette === 'green-crt' && a > 0 && (r > g / 2 || b > g / 2)) throw new Error(`${name} contains non-CRT colour contamination`);
    }
  }
  if (transparent === 0) throw new Error(`${name} has no transparent exterior pixels`);
}

if (process.argv.length !== 6) {
  console.error('Usage: prepare-nursery-assets.mjs <vacant-source> <construction-source> <open-source> <output-directory>');
  process.exit(64);
}

const [, , vacantSource, constructionSource, openSource, outputDirectory] = process.argv;
mkdirSync(outputDirectory, { recursive: true });
const region = (x, y, width, height, toX, toY, toWidth, toHeight) => ({ from: { x, y, width, height }, to: { x: toX, y: toY, width: toWidth, height: toHeight } });
const jobs = [
  {
    source: vacantSource, output: 'nursery-vacant-atari-bw.png', palette: 'grayscale',
    postBottom: 272,
    regions: [region(42, 710, 1230, 315, 8, 116, 372, 218)],
  },
  {
    source: constructionSource, output: 'nursery-construction-green-crt.png', palette: 'green-crt',
    postBottom: 316,
    regions: [region(28, 694, 1290, 350, 0, 112, 388, 222)],
  },
  {
    source: openSource, output: 'nursery-open-atari-colour.png', palette: 'colour',
    postBottom: 316,
    regions: [region(14, 694, 1318, 366, 0, 112, 388, 222)],
  },
];

for (const job of jobs) {
  const source = readPNG(job.source);
  const output = { width: WIDTH, height: HEIGHT, pixels: Buffer.alloc(WIDTH * HEIGHT * 4) };
  for (const mapping of job.regions) blitNearest(source, output, mapping, job.palette);
  removeBakedNurserySign(output, job.postBottom);
  clearRect(output, DOOR);
  validate(output, job.palette, job.output);
  const outputPath = join(outputDirectory, job.output);
  writePNG(outputPath, output);
  validate(readPNG(outputPath), job.palette, job.output);
  console.log(`Prepared and validated ${job.output} (${WIDTH} × ${HEIGHT})`);
}
