export type ShrinkErrorCode =
  | "not-an-image"
  | "svg"
  | "file-too-large"
  | "too-many-pixels"
  | "cannot-fit"
  | "unsupported-browser";

/** Why a file could not be turned into a small image. Switch on `code`, not on the message. */
export class ShrinkError extends Error {
  readonly code: ShrinkErrorCode;

  constructor(code: ShrinkErrorCode) {
    super(code);
    this.name = "ShrinkError";
    this.code = code;
  }
}

export interface ShrinkResult {
  /** A `data:image/webp`, `png` or `jpeg` base64 URI, at most `maxChars` long. */
  dataUri: string;
  width: number;
  height: number;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
/**
 * How much of the start of the file is read before decoding: enough to sniff the type (a byte
 * order mark and whitespace before `<svg`) and to find a JPEG's frame header past its metadata.
 */
const HEADER_BYTES = 256 * 1024;
/** Longest side to try, largest first. Each is capped at the image's own longest side. */
const SIDES = [512, 384, 256, 192, 128, 96, 64] as const;
/** WebP qualities to try at each size, best first. */
const QUALITIES = [0.9, 0.8, 0.65, 0.5] as const;
const ENCODED = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const startsWith = (bytes: Uint8Array, at: number, expected: readonly number[]) =>
  bytes.length >= at + expected.length && expected.every((b, i) => bytes[at + i] === b);

/**
 * What a file is, from its first bytes alone: never the extension or the declared type.
 * `"svg"` means text that opens like an SVG or XML document; it is refused, never parsed.
 */
export function sniffImageType(bytes: Uint8Array): "png" | "jpeg" | "webp" | "svg" | undefined {
  if (startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (
    startsWith(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  )
    return "webp";

  let i = startsWith(bytes, 0, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  while (i < bytes.length && [0x09, 0x0a, 0x0d, 0x20].includes(bytes[i] as number)) i++;
  const head = String.fromCharCode(...bytes.subarray(i, i + 5)).toLowerCase();
  return head.startsWith("<svg") || head === "<?xml" ? "svg" : undefined;
}

const be16 = (b: Uint8Array, at: number) => ((b[at] as number) << 8) | (b[at + 1] as number);
const be32 = (b: Uint8Array, at: number) => (be16(b, at) * 65_536 + be16(b, at + 2)) >>> 0;
const le16 = (b: Uint8Array, at: number) => (b[at] as number) | ((b[at + 1] as number) << 8);
const le24 = (b: Uint8Array, at: number) => le16(b, at) | ((b[at + 2] as number) << 16);
const le32 = (b: Uint8Array, at: number) => (le24(b, at) | ((b[at + 3] as number) << 24)) >>> 0;

/**
 * The width and height an image's own header claims, without decoding it, so a tiny file that
 * describes a huge picture can be refused before it costs any memory. `undefined` when the header
 * is cut short or the size is not where it should be; the decoded size is checked as well.
 */
export function readImageSize(
  bytes: Uint8Array,
  kind: "png" | "jpeg" | "webp",
): { width: number; height: number } | undefined {
  if (kind === "png") {
    if (bytes.length < 24 || !startsWith(bytes, 12, [0x49, 0x48, 0x44, 0x52])) return undefined;
    return { width: be32(bytes, 16), height: be32(bytes, 20) };
  }

  if (kind === "webp") {
    if (startsWith(bytes, 12, [0x56, 0x50, 0x38, 0x58]) && bytes.length >= 30)
      return { width: le24(bytes, 24) + 1, height: le24(bytes, 27) + 1 };
    if (startsWith(bytes, 12, [0x56, 0x50, 0x38, 0x4c]) && bytes.length >= 25) {
      if (bytes[20] !== 0x2f) return undefined;
      const bits = le32(bytes, 21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (startsWith(bytes, 12, [0x56, 0x50, 0x38, 0x20]) && bytes.length >= 30) {
      if (!startsWith(bytes, 23, [0x9d, 0x01, 0x2a])) return undefined;
      return { width: le16(bytes, 26) & 0x3fff, height: le16(bytes, 28) & 0x3fff };
    }
    return undefined;
  }

  // JPEG: walk the segments after the start marker until a frame header (SOF0-SOF15, but not
  // DHT 0xc4, JPG 0xc8 or DAC 0xcc). The scan data (0xda) starts after every header.
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1] as number;
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return undefined;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (at + 9 > bytes.length) return undefined;
      return { width: be16(bytes, at + 7), height: be16(bytes, at + 5) };
    }
    at += 2 + be16(bytes, at + 2);
  }
  return undefined;
}

function encodeToFit(bitmap: ImageBitmap, maxChars: number): ShrinkResult {
  const longest = Math.max(bitmap.width, bitmap.height);
  for (const side of new Set(SIDES.map((s) => Math.min(s, longest)))) {
    const scale = side / longest;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new ShrinkError("unsupported-browser");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    for (const quality of QUALITIES) {
      const dataUri = canvas.toDataURL("image/webp", quality);
      if (dataUri.length <= maxChars && ENCODED.test(dataUri)) return { dataUri, width, height };
      // A browser that cannot encode WebP answers with PNG, which ignores quality.
      if (dataUri.startsWith("data:image/png")) break;
    }
  }
  throw new ShrinkError("cannot-fit");
}

/**
 * Turns a PNG, JPEG or WebP file into a data URI of at most `maxChars` characters, in the browser.
 * The file is checked from its first bytes, decoded to prove it is an image, then drawn onto a
 * canvas and re-encoded at smaller and smaller sizes until it fits. It keeps transparency, never
 * upscales, never reads SVG and never fetches anything. Throws a `ShrinkError`.
 */
export async function shrinkImage(file: Blob, maxChars: number): Promise<ShrinkResult> {
  if (file.size > MAX_FILE_BYTES) throw new ShrinkError("file-too-large");

  const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const kind = sniffImageType(head);
  if (kind === "svg") throw new ShrinkError("svg");
  if (kind === undefined) throw new ShrinkError("not-an-image");
  // Decoding spends memory for every pixel, so refuse what the header says is too big first.
  const claimed = readImageSize(head, kind);
  if (claimed && claimed.width * claimed.height > MAX_PIXELS)
    throw new ShrinkError("too-many-pixels");
  if (typeof createImageBitmap !== "function") throw new ShrinkError("unsupported-browser");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ShrinkError("not-an-image");
  }
  try {
    if (bitmap.width < 1 || bitmap.height < 1) throw new ShrinkError("not-an-image");
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new ShrinkError("too-many-pixels");
    return encodeToFit(bitmap, maxChars);
  } finally {
    bitmap.close();
  }
}
