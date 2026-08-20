/* Minimal but spec-compliant QR encoder — byte mode, ECC level L, mask 0, versions 1–6.
 * Produces matrices that real phone cameras can scan. No dependencies.
 */

const DATA_CW = [19, 34, 55, 80, 108, 136]; // data codewords per version (ECC L)
const EC_CW = [7, 10, 15, 20, 26, 18]; // error-correction codewords per block
const BLOCKS = [1, 1, 1, 1, 1, 2]; // block count (uniform split for v6)
const ALIGN = [0, 18, 22, 26, 30, 34]; // alignment center coordinate (v≥2)

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  return a && b ? EXP[LOG[a] + LOG[b]] : 0;
}

/* generator polynomial coefficients, highest degree first, length deg+1 */
function rsGenPoly(deg: number): number[] {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j + 1] ^= g[j];
      ng[j] ^= gfMul(g[j], EXP[i]);
    }
    g = ng;
  }
  return g;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenPoly(ecLen).slice(1); // drop leading 1
  const rem = new Uint8Array(ecLen);
  for (const b of data) {
    const factor = b ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    if (factor) {
      for (let i = 0; i < ecLen; i++) rem[i] ^= gfMul(gen[i], factor);
    }
  }
  return rem;
}

export function encodeQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  /* pick smallest version that fits (byte-mode capacity = dataCW - 2) */
  let vi = DATA_CW.findIndex((cw) => bytes.length <= cw - 2);
  if (vi === -1) vi = DATA_CW.length - 1; // clamp + truncate
  const v = vi + 1;
  const size = 17 + 4 * v;
  const dataCW = DATA_CW[vi];
  const ecCW = EC_CW[vi];
  const blocks = BLOCKS[vi];

  /* ---- bit stream: mode(4) + count(8) + data + terminator + pad ---- */
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  const n = Math.min(bytes.length, dataCW - 2);
  push(0b0100, 4);
  push(n, 8);
  for (let i = 0; i < n; i++) push(bytes[i], 8);
  push(0, Math.min(4, dataCW * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  let alt = false;
  while (bits.length < dataCW * 8) {
    push(alt ? 0x11 : 0xec, 8);
    alt = !alt;
  }
  const data = new Uint8Array(dataCW);
  bits.forEach((b, i) => {
    data[i >> 3] |= b << (7 - (i & 7));
  });

  /* ---- split into blocks, compute EC, interleave ---- */
  const blockSize = dataCW / blocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < blocks; b++) {
    const blk = data.slice(b * blockSize, (b + 1) * blockSize);
    dataBlocks.push(blk);
    ecBlocks.push(rsEncode(blk, ecCW));
  }
  const finalBytes: number[] = [];
  for (let i = 0; i < blockSize; i++) for (let b = 0; b < blocks; b++) finalBytes.push(dataBlocks[b][i]);
  for (let i = 0; i < ecCW; i++) for (let b = 0; b < blocks; b++) finalBytes.push(ecBlocks[b][i]);

  /* ---- matrix + function patterns ---- */
  const mod: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFn = (r: number, c: number, dark: boolean) => {
    mod[r][c] = dark;
    isFunc[r][c] = true;
  };

  /* finders + separators */
  const finder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inCore = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const dark =
          inCore && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFn(rr, cc, dark);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  /* timing */
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  /* alignment (single pattern at bottom-right for v2–6) */
  if (v >= 2) {
    const a = ALIGN[vi];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        setFn(a + dr, a + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
  }

  /* dark module + reserved format areas */
  setFn(4 * v + 9, 8, true);
  for (let i = 0; i <= 8; i++) {
    isFunc[8][i] = true;
    isFunc[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = true;
    isFunc[size - 1 - i][8] = true;
  }

  /* ---- data placement in zigzag, mask 0 applied inline ---- */
  const totalBits = finalBytes.length * 8;
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        const col = right - j;
        if (isFunc[row][col]) continue;
        let dark = idx < totalBits && ((finalBytes[idx >> 3] >> (7 - (idx & 7))) & 1) === 1;
        if ((row + col) % 2 === 0) dark = !dark; // mask 0
        mod[row][col] = dark;
        idx++;
      }
    }
  }

  /* ---- format info (ECC L = 01, mask 0), BCH(15,5) + 0x5412 ---- */
  const fmt5 = (0b01 << 3) | 0;
  let bch = fmt5;
  for (let i = 0; i < 10; i++) {
    bch <<= 1;
    if (bch & (1 << 10)) bch ^= 0x537;
  }
  const format = ((fmt5 << 10) | bch) ^ 0x5412;
  const fb: boolean[] = [];
  for (let i = 14; i >= 0; i--) fb.push(((format >> i) & 1) === 1);

  const copy1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  copy1.forEach(([r, c], i) => (mod[r][c] = fb[i]));
  const copy2: [number, number][] = [];
  for (let i = 0; i < 7; i++) copy2.push([size - 1 - i, 8]);
  for (let i = 0; i < 8; i++) copy2.push([8, size - 8 + i]);
  copy2.forEach(([r, c], i) => (mod[r][c] = fb[i]));

  return mod;
}
