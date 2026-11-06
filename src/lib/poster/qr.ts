// Pure TypeScript ISO/IEC 18004 QR Code matrix generator (Byte mode, ECC Level L, Versions 1–6).
// Zero external dependencies; works in both browser canvas (Konva) and PDF generation.

interface VersionInfo {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewords: number;
  alignment: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, size: 21, dataCodewords: 19, ecCodewords: 7, alignment: [] },
  { version: 2, size: 25, dataCodewords: 34, ecCodewords: 10, alignment: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecCodewords: 15, alignment: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecCodewords: 20, alignment: [6, 26] },
  { version: 5, size: 37, dataCodewords: 108, ecCodewords: 26, alignment: [6, 30] },
  { version: 6, size: 41, dataCodewords: 136, ecCodewords: 36, alignment: [6, 34] },
];

// GF(256) tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

function interleaveVersion6(data: Uint8Array): Uint8Array {
  // Version 6-L uses 2 blocks of (68 data, 18 EC)
  const block1 = data.subarray(0, 68);
  const block2 = data.subarray(68, 136);
  const ec1 = rsEncode(block1, 18);
  const ec2 = rsEncode(block2, 18);
  const out = new Uint8Array(136 + 36);
  let p = 0;
  for (let i = 0; i < 68; i++) {
    out[p++] = block1[i];
    out[p++] = block2[i];
  }
  for (let i = 0; i < 18; i++) {
    out[p++] = ec1[i];
    out[p++] = ec2[i];
  }
  return out;
}

function encodeCodewords(bytes: Uint8Array, info: VersionInfo): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  // Byte mode indicator (0100)
  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) pushBits(b, 8);
  // Terminator
  const capacityBits = info.dataCodewords * 8;
  const term = Math.min(4, capacityBits - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const data = new Uint8Array(info.dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    data[i] = byte;
  }
  const pads = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < info.dataCodewords; i++, p ^= 1) {
    data[i] = pads[p];
  }

  if (info.version === 6) return interleaveVersion6(data);
  const ec = rsEncode(data, info.ecCodewords);
  const out = new Uint8Array(data.length + ec.length);
  out.set(data, 0);
  out.set(ec, data.length);
  return out;
}

function formatBits(mask: number): number {
  // ECC Level L = 01
  const data = (0b01 << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0b101010000010010;
}

/** Encodes a string into a 2D boolean QR matrix (true = dark module). */
export function encodeQrMatrix(text: string): boolean[][] {
  const raw = new TextEncoder().encode(text.trim() || "https://superflyr.app");
  // Pick smallest version that fits raw.length + 2 bytes header
  const clipped = raw.length > 134 ? raw.subarray(0, 134) : raw;
  const info = VERSIONS.find((v) => v.dataCodewords - 2 >= clipped.length) ?? VERSIONS[VERSIONS.length - 1];
  const N = info.size;

  const modules: boolean[][] = Array.from({ length: N }, () => Array<boolean>(N).fill(false));
  const reserved: boolean[][] = Array.from({ length: N }, () => Array<boolean>(N).fill(false));

  const setModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < N && c >= 0 && c < N) {
      modules[r][c] = dark;
      reserved[r][c] = true;
    }
  };

  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(row + r, col + c, inOuter && (onBorder || inInner));
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, N - 7);
  placeFinder(N - 7, 0);

  // Alignment patterns
  const align = info.alignment;
  for (const r of align) {
    for (const c of align) {
      if ((r < 9 && c < 9) || (r < 9 && c > N - 10) || (r > N - 10 && c < 9)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setModule(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    if (!reserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!reserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module & reserve format info areas
  setModule(N - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][N - 1 - i] = true;
    reserved[N - 1 - i][8] = true;
  }

  // Data bits
  const codewords = encodeCodewords(clipped, info);
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < N; step++) {
      const row = upward ? N - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (reserved[row][c]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          dark = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
        }
        // Mask 0: (row + c) % 2 === 0
        if ((row + c) % 2 === 0) dark = !dark;
        modules[row][c] = dark;
      }
    }
    upward = !upward;
  }

  // Place format bits for mask 0
  const fmt = formatBits(0);
  const fBit = (i: number) => ((fmt >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) modules[8][i] = fBit(14 - i);
  modules[8][7] = fBit(8);
  modules[8][8] = fBit(7);
  modules[7][8] = fBit(6);
  for (let i = 0; i < 6; i++) modules[5 - i][8] = fBit(5 - i);
  for (let i = 0; i < 8; i++) modules[8][N - 1 - i] = fBit(i);
  for (let i = 0; i < 7; i++) modules[N - 7 + i][8] = fBit(14 - i);

  return modules;
}

/** Converts a QR matrix into an SVG `<path d="...">` string (with a quiet zone of `margin` modules). */
export function qrMatrixToSvgPath(matrix: boolean[][], margin = 2): { path: string; size: number } {
  const N = matrix.length;
  let path = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c]) {
        path += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }
  return { path, size: N + margin * 2 };
}

/** Renders a high-resolution printable/shareable QR code card PNG for a public offer link. */
export async function renderQrCardPng(url: string, title: string, storeName?: string): Promise<Blob> {
  const matrix = encodeQrMatrix(url);
  const N = matrix.length;
  const W = 800;
  const H = 980;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Card background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Decorative top header band
  ctx.fillStyle = "#15803d";
  ctx.fillRect(0, 0, W, 170);

  // Store name & offer title
  ctx.textAlign = "center";
  ctx.fillStyle = "#dcfce7";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  ctx.fillText((storeName || "TODAY'S SPECIAL OFFERS").slice(0, 40), W / 2, 62);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 40px system-ui, -apple-system, sans-serif";
  ctx.fillText((title || "Scan for Today's Offers").slice(0, 34), W / 2, 122);

  // QR Box frame
  const qrBoxSize = 560;
  const qrBoxX = (W - qrBoxSize) / 2;
  const qrBoxY = 220;
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 4;
  ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

  const margin = 3;
  const cell = qrBoxSize / (N + margin * 2);
  ctx.fillStyle = "#111827";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          Math.floor(qrBoxX + (c + margin) * cell),
          Math.floor(qrBoxY + (r + margin) * cell),
          Math.ceil(cell),
          Math.ceil(cell),
        );
      }
    }
  }

  // Footer instructions
  ctx.fillStyle = "#111827";
  ctx.font = "700 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("📱 Scan QR Code to View Offers & Order on WhatsApp", W / 2, 845);

  ctx.fillStyle = "#6b7280";
  ctx.font = "500 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(url.slice(0, 64), W / 2, 895);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render QR image."))), "image/png");
  });
}

