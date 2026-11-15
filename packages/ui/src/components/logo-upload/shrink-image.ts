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
/** Enough to see past a byte order mark and leading whitespace to `<svg` or `<?xml`. */
const SNIFF_BYTES = 64;
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

  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  const kind = sniffImageType(head);
  if (kind === "svg") throw new ShrinkError("svg");
  if (kind === undefined) throw new ShrinkError("not-an-image");
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
