import { afterEach, describe, expect, it, vi } from "vitest";
import { readImageSize, shrinkImage } from "./shrink-image.js";
import { blobOf, PNG, stubBrowser } from "./test-support.js";

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >>> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const tag = (s: string) => [...s].map((c) => c.charCodeAt(0));

const png = (w: number, h: number) =>
  Uint8Array.of(
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0,
    0,
    0,
    13,
    ...tag("IHDR"),
    ...be32(w),
    ...be32(h),
    8,
    6,
    0,
    0,
    0,
  );
const riff = (...rest: number[]) =>
  Uint8Array.of(...tag("RIFF"), 0, 0, 0, 0, ...tag("WEBP"), ...rest);
const webpX = (w: number, h: number) =>
  riff(...tag("VP8X"), 10, 0, 0, 0, 0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1));
const webpL = (w: number, h: number) => {
  const bits = ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14);
  return riff(
    ...tag("VP8L"),
    5,
    0,
    0,
    0,
    0x2f,
    bits & 255,
    (bits >>> 8) & 255,
    (bits >>> 16) & 255,
    (bits >>> 24) & 255,
  );
};
const webpLossy = (w: number, h: number) =>
  riff(...tag("VP8 "), 10, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h));
/** SOI, an APP0 segment, then a frame header: `marker` 0xc0 is baseline, 0xc2 progressive. */
const jpeg = (w: number, h: number, marker = 0xc0) =>
  Uint8Array.of(
    0xff,
    0xd8,
    0xff,
    0xe0,
    0,
    6,
    1,
    2,
    3,
    4,
    0xff,
    marker,
    0,
    11,
    8,
    ...be16(h),
    ...be16(w),
    1,
    0,
    0,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("readImageSize", () => {
  it("reads a PNG's width and height from its header", () => {
    expect(readImageSize(png(30_000, 20_000), "png")).toEqual({ width: 30_000, height: 20_000 });
  });

  it("reads WebP size from VP8X, VP8L and lossy VP8 headers", () => {
    expect(readImageSize(webpX(4000, 3000), "webp")).toEqual({ width: 4000, height: 3000 });
    expect(readImageSize(webpL(1234, 567), "webp")).toEqual({ width: 1234, height: 567 });
    expect(readImageSize(webpLossy(800, 600), "webp")).toEqual({ width: 800, height: 600 });
  });

  it("reads a JPEG's size from a baseline or a progressive frame header", () => {
    expect(readImageSize(jpeg(6000, 4000), "jpeg")).toEqual({ width: 6000, height: 4000 });
    expect(readImageSize(jpeg(6000, 4000, 0xc2), "jpeg")).toEqual({ width: 6000, height: 4000 });
  });

  it("skips JPEG segments that are not frame headers (a DHT marker looks like one)", () => {
    const withDht = Uint8Array.of(
      0xff,
      0xd8,
      0xff,
      0xc4,
      0,
      4,
      0,
      0,
      0xff,
      0xc0,
      0,
      11,
      8,
      ...be16(10),
      ...be16(20),
      1,
      0,
      0,
    );
    expect(readImageSize(withDht, "jpeg")).toEqual({ width: 20, height: 10 });
  });

  it("returns undefined when the header is cut short or has no frame header", () => {
    expect(readImageSize(png(10, 10).subarray(0, 20), "png")).toBeUndefined();
    expect(readImageSize(webpX(10, 10).subarray(0, 26), "webp")).toBeUndefined();
    expect(
      readImageSize(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 6, 1, 2), "jpeg"),
    ).toBeUndefined();
    expect(
      readImageSize(Uint8Array.of(0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0), "jpeg"),
    ).toBeUndefined();
    expect(readImageSize(riff(...tag("ABCD"), 0, 0, 0, 0), "webp")).toBeUndefined();
  });
});

describe("shrinkImage: a header that claims too many pixels", () => {
  it.each([
    ["PNG", png(30_000, 30_000)],
    ["WebP (VP8X)", webpX(16_000, 16_000)],
    ["JPEG", jpeg(10_000, 5_000)],
  ])("refuses a %s before decoding it", async (_name, bytes) => {
    const { decode, canvases } = stubBrowser({ width: 10, height: 10 });
    await expect(shrinkImage(blobOf(bytes), 32_768)).rejects.toMatchObject({
      code: "too-many-pixels",
    });
    expect(decode).not.toHaveBeenCalled();
    expect(canvases).toHaveLength(0);
  });

  it("accepts a header exactly at the limit, and refuses one pixel over", async () => {
    const { decode } = stubBrowser(
      { width: 800, height: 600 },
      () => "data:image/webp;base64,AAAA",
    );
    await expect(shrinkImage(blobOf(png(8_000, 5_000)), 32_768)).resolves.toBeDefined();
    expect(decode).toHaveBeenCalledTimes(1);
    await expect(shrinkImage(blobOf(png(8_000, 5_001)), 32_768)).rejects.toMatchObject({
      code: "too-many-pixels",
    });
  });

  it("still decodes when the size cannot be read, and the decoded size is checked too", async () => {
    const { decode, close } = stubBrowser({ width: 10_000, height: 5_000 });
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({
      code: "too-many-pixels",
    });
    expect(decode).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
