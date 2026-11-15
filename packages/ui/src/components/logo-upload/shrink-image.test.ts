import { afterEach, describe, expect, it, vi } from "vitest";
import { isAssetRef, MAX_DATA_URI_CHARS } from "../../theme/config.js";
import { ShrinkError, shrinkImage, sniffImageType } from "./shrink-image.js";
import { blobOf, GIF, JPEG, PNG, stubBrowser, text, WEBP } from "./test-support.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sniffImageType", () => {
  it("reads PNG, JPEG and WebP from their first bytes", () => {
    expect(sniffImageType(PNG)).toBe("png");
    expect(sniffImageType(JPEG)).toBe("jpeg");
    expect(sniffImageType(WEBP)).toBe("webp");
  });

  it("returns svg for text starting <svg or <?xml, with leading whitespace or a BOM", () => {
    expect(sniffImageType(text("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBe("svg");
    expect(sniffImageType(text('<?xml version="1.0"?><svg/>'))).toBe("svg");
    expect(sniffImageType(text("  \n\t<SVG/>"))).toBe("svg");
    expect(sniffImageType(Uint8Array.of(0xef, 0xbb, 0xbf, ...text("<svg/>")))).toBe("svg");
  });

  it("returns undefined for GIF, PDF, HTML, empty and one-byte input", () => {
    expect(sniffImageType(GIF)).toBeUndefined();
    expect(sniffImageType(text("%PDF-1.7"))).toBeUndefined();
    expect(sniffImageType(text("<html><body></body></html>"))).toBeUndefined();
    expect(sniffImageType(new Uint8Array())).toBeUndefined();
    expect(sniffImageType(Uint8Array.of(0x89))).toBeUndefined();
    expect(
      sniffImageType(Uint8Array.of(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41)),
    ).toBeUndefined();
  });
});

describe("shrinkImage: refusals", () => {
  it("refuses a file named .png whose bytes are SVG with code svg, and never decodes it", async () => {
    const { decode } = stubBrowser({ width: 10, height: 10 });
    const file = new File([text("<svg xmlns='http://www.w3.org/2000/svg'/>")], "logo.png", {
      type: "image/png",
    });
    await expect(shrinkImage(file, 32_768)).rejects.toMatchObject({ code: "svg" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("refuses GIF bytes with code not-an-image", async () => {
    const { decode } = stubBrowser({ width: 10, height: 10 });
    await expect(shrinkImage(blobOf(GIF), 32_768)).rejects.toMatchObject({
      code: "not-an-image",
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it("refuses an empty file", async () => {
    stubBrowser({ width: 10, height: 10 });
    await expect(shrinkImage(new Blob([]), 32_768)).rejects.toMatchObject({
      code: "not-an-image",
    });
  });

  it("refuses a file over 10 MiB with file-too-large before reading it", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const slice = vi.fn(() => {
      throw new Error("must not be read");
    });
    const huge = { size: 10 * 1024 * 1024 + 1, slice } as unknown as Blob;
    await expect(shrinkImage(huge, 32_768)).rejects.toMatchObject({ code: "file-too-large" });
    expect(slice).not.toHaveBeenCalled();
    expect(decode).not.toHaveBeenCalled();
  });

  it("refuses an image over 40 million pixels with too-many-pixels and closes the bitmap", async () => {
    const { close, calls } = stubBrowser({ width: 10_000, height: 5_000 });
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({
      code: "too-many-pixels",
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it("throws unsupported-browser when createImageBitmap is missing", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({
      code: "unsupported-browser",
    });
  });

  it("throws unsupported-browser when the canvas has no 2d context", async () => {
    const { close } = stubBrowser({ width: 100, height: 100 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({
      code: "unsupported-browser",
    });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("throws not-an-image when decoding rejects", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new DOMException("The source image could not be decoded.", "InvalidStateError");
      }),
    );
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({
      code: "not-an-image",
    });
  });

  it("throws a ShrinkError", async () => {
    await expect(shrinkImage(new Blob([]), 32_768)).rejects.toBeInstanceOf(ShrinkError);
  });
});

describe("shrinkImage: shrinking", () => {
  it("returns the first size that fits, descending 512, 384, ... and keeps the aspect ratio", async () => {
    const { calls } = stubBrowser(
      { width: 2000, height: 1000 },
      ({ width }) => `data:image/webp;base64,${"A".repeat(width <= 256 ? 1000 : 40_000)}`,
    );
    const result = await shrinkImage(blobOf(PNG), 32_768);
    expect(result.width).toBe(256);
    expect(result.height).toBe(128);
    const widths = [...new Set(calls.map((c) => c.width))];
    expect(widths).toEqual([512, 384, 256]);
  });

  it("never upscales", async () => {
    const { canvases } = stubBrowser(
      { width: 40, height: 30 },
      () => "data:image/webp;base64,AAAA",
    );
    const result = await shrinkImage(blobOf(PNG), 32_768);
    expect(result.width).toBe(40);
    expect(result.height).toBe(30);
    expect(canvases[0]?.width).toBe(40);
  });

  it("tries lower qualities before a smaller size", async () => {
    const { calls } = stubBrowser(
      { width: 2000, height: 2000 },
      ({ quality }) =>
        `data:image/webp;base64,${"A".repeat(quality !== undefined && quality <= 0.8 ? 1000 : 40_000)}`,
    );
    const result = await shrinkImage(blobOf(PNG), 32_768);
    expect(result.width).toBe(512);
    expect(calls.map((c) => [c.width, c.type, c.quality])).toEqual([
      [512, "image/webp", 0.9],
      [512, "image/webp", 0.8],
    ]);
  });

  it("throws cannot-fit when nothing fits", async () => {
    stubBrowser(
      { width: 2000, height: 2000 },
      () => `data:image/webp;base64,${"A".repeat(40_000)}`,
    );
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({ code: "cannot-fit" });
  });

  it("honours a smaller maxChars", async () => {
    stubBrowser(
      { width: 2000, height: 2000 },
      ({ width }) => `data:image/webp;base64,${"A".repeat(width * 10)}`,
    );
    const result = await shrinkImage(blobOf(PNG), 2000);
    expect(result.dataUri.length).toBeLessThanOrEqual(2000);
    expect(result.width).toBeLessThan(512);
  });

  it("accepts a PNG fallback when webp is not encoded", async () => {
    stubBrowser({ width: 300, height: 300 }, () => "data:image/png;base64,AAAA");
    const result = await shrinkImage(blobOf(PNG), 32_768);
    expect(result.dataUri).toBe("data:image/png;base64,AAAA");
  });

  it("refuses an encoder result that is not png, jpeg or webp, then reports cannot-fit", async () => {
    stubBrowser({ width: 300, height: 300 }, () => "data:image/gif;base64,AAAA");
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toMatchObject({ code: "cannot-fit" });
  });

  it("the result matches the data URI shape the theme accepts", async () => {
    stubBrowser({ width: 800, height: 600 });
    const result = await shrinkImage(blobOf(PNG), MAX_DATA_URI_CHARS);
    expect(isAssetRef(result.dataUri)).toBe(true);
    expect(MAX_DATA_URI_CHARS).toBe(32_768);
  });

  it("closes the bitmap on success and on failure", async () => {
    const ok = stubBrowser({ width: 100, height: 100 }, () => "data:image/webp;base64,AAAA");
    await shrinkImage(blobOf(PNG), 32_768);
    expect(ok.close).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
    const bad = stubBrowser(
      { width: 100, height: 100 },
      () => `data:image/webp;base64,${"A".repeat(40_000)}`,
    );
    await expect(shrinkImage(blobOf(PNG), 32_768)).rejects.toBeInstanceOf(ShrinkError);
    expect(bad.close).toHaveBeenCalledTimes(1);
  });
});
