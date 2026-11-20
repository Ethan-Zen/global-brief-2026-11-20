// make.fun entry for news-image-20261120: writes the front page of Friday 20 November 2026 to
// /output/entry.png. The page was laid out as HTML and rasterised to entry.png at 1024 by 1024;
// this program hands that file over under the name the gate reads, after checking it against the
// gate's own limits so a broken build fails here instead of at the gate.

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'entry.png');
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const target = join(outputDir, 'entry.png');

// A whole PNG starts with its eight-byte signature, then the IHDR length and type, then width and
// height as big-endian 32-bit integers. Twenty-four bytes are enough to see all of that.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const header = readFileSync(source).subarray(0, 24);
if (!header.subarray(0, 8).equals(PNG_SIGNATURE)) {
  throw new Error('entry.png does not start with the PNG signature');
}

const width = header.readUInt32BE(16);
const height = header.readUInt32BE(20);
const size = statSync(source).size;

// A whole PNG closes with an IEND chunk: four bytes of length, the type, then its CRC. A file cut
// short while it was being written would pass the header test and fail here instead of at the gate.
const all = readFileSync(source);
if (all.subarray(size - 8, size - 4).toString('latin1') !== 'IEND') {
  throw new Error('entry.png does not end with an IEND chunk, so it is not a whole PNG');
}

if (width > 1024 || height > 1024) {
  throw new Error(`entry.png is ${width} by ${height}, larger than the 1024 by 1024 the gate allows`);
}
if (size > 1048576) {
  throw new Error(`entry.png is ${size} bytes, over the 1 MiB the gate allows`);
}

mkdirSync(outputDir, { recursive: true });
copyFileSync(source, target);

// Both runs must write the same bytes, so print the digest of what was written: two runs of the
// grader show one line each and the lines have to match.
const digest = createHash('sha256').update(readFileSync(target)).digest('hex');
console.log(`wrote ${target}: ${width} by ${height}, ${size} bytes, sha256 ${digest}`);
