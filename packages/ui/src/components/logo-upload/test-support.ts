import { type Mock, vi } from "vitest";

/** Just enough of each format's first bytes for `sniffImageType`. */
export const PNG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
export const JPEG = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
export const WEBP = Uint8Array.of(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50);
export const GIF = new TextEncoder().encode("GIF89a\u0001\u0000\u0001\u0000");
export const text = (s: string) => new TextEncoder().encode(s);
export const blobOf = (bytes: Uint8Array) => new Blob([bytes as BlobPart]);

export interface Call {
  width: number;
  type: string | undefined;
  quality: number | undefined;
}

/**
 * Stub the browser primitives jsdom lacks (`createImageBitmap` and the canvas). `encode` returns
 * the data URI for one `toDataURL` attempt. Undo with `vi.unstubAllGlobals()` and
 * `vi.restoreAllMocks()`.
 */
export function stubBrowser(
  size: { width: number; height: number },
  encode: (call: Call) => string = ({ width }) =>
    `data:image/webp;base64,${"A".repeat(width * 100)}`,
): {
  close: Mock;
  decode: Mock;
  drawImage: Mock;
  calls: Call[];
  canvases: HTMLCanvasElement[];
} {
  const close = vi.fn();
  const decode = vi.fn(async () => ({ ...size, close }));
  vi.stubGlobal("createImageBitmap", decode);
  const drawImage = vi.fn();
  const canvases: HTMLCanvasElement[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    canvases.push(this);
    return { drawImage, imageSmoothingQuality: "low" } as unknown as CanvasRenderingContext2D;
  } as never);
  const calls: Call[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (
    this: HTMLCanvasElement,
    type?: string,
    quality?: number,
  ) {
    const call = { width: this.width, type, quality };
    calls.push(call);
    return encode(call);
  });
  return { close, decode, drawImage, calls, canvases };
}
