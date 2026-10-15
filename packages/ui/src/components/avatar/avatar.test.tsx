import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi } from "../../test-utils/index.js";
import { Avatar, AvatarGroup, getInitials } from "./avatar.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const root = (container: HTMLElement) => container.querySelector("[role=img]") as HTMLElement;

afterEach(() => vi.unstubAllGlobals());

describe("getInitials", () => {
  it.each([
    ["Aroha Ngata", "AN"],
    ["mere", "M"],
    ["  Hemi   Te Rangi  ", "HT"],
    ["Ana-Maria Lopez", "AL"],
    ["Åsa Öberg", "ÅÖ"],
    ["李 小龙", "李小"],
    ["", ""],
    ["   ", ""],
  ])("%j becomes %j", (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });

  it("uses at most two letters, uppercased", () => {
    expect(getInitials("a b c d")).toBe("AB");
  });

  it("does not split a surrogate pair (emoji or rare characters) in half", () => {
    expect(getInitials("😀 Smile")).toBe("😀S");
    expect(getInitials("𠮷野家")).toBe("𠮷");
  });
});

describe("Avatar: fallback and naming", () => {
  it("shows initials from the name and is labelled with it", () => {
    const { container } = renderUi(<Avatar name="Aroha Ngata" />);
    expect(root(container).getAttribute("aria-label")).toBe("Aroha Ngata");
    expect(root(container).textContent).toBe("AN");
  });

  it("uses `alt` as the label when given, instead of the name", () => {
    const { container } = renderUi(<Avatar name="Aroha Ngata" alt="Aroha, account owner" />);
    expect(root(container).getAttribute("aria-label")).toBe("Aroha, account owner");
  });

  it("shows a custom fallback node when there is no name", () => {
    const { container } = renderUi(<Avatar alt="Guest" fallback={<i data-testid="f" />} />);
    expect(container.querySelector("[data-testid=f]")).not.toBeNull();
  });

  it("falls back to a placeholder glyph when there is nothing to show, and stays labelled", () => {
    const { container } = renderUi(<Avatar alt="Unknown user" />);
    expect(root(container).getAttribute("aria-label")).toBe("Unknown user");
    expect(root(container).textContent).not.toBe("");
  });

  it("falls back when the image never loads (offline, 404)", () => {
    const { container } = renderUi(<Avatar src="/missing.png" name="Mere Walker" />);
    expect(root(container).textContent).toBe("MW");
  });

  it("is hidden from assistive technology when decorative", () => {
    const { container } = renderUi(<Avatar name="Aroha Ngata" decorative />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.hasAttribute("role")).toBe(false);
  });

  it("requires a name or alt at the type level unless decorative", () => {
    // @ts-expect-error an avatar needs a name, alt or decorative
    const element = <Avatar />;
    expect(element).toBeTruthy();
  });
});

describe("Avatar: image", () => {
  function stubImage(outcome: "load" | "error") {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      referrerPolicy = "";
      crossOrigin: string | null = null;
      complete = false;
      naturalWidth = outcome === "load" ? 10 : 0;
      set src(_value: string) {
        queueMicrotask(() => (outcome === "load" ? this.onload?.() : this.onerror?.()));
      }
    }
    vi.stubGlobal("Image", FakeImage);
    (window as unknown as { Image: unknown }).Image = FakeImage;
  }

  it("shows the image once it has loaded, and the label stays on the avatar", async () => {
    stubImage("load");
    const { container } = renderUi(<Avatar src="/a.png" name="Aroha Ngata" />);
    await vi.waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/a.png");
    // the avatar carries the name; the image itself is decorative so it is not announced twice
    expect(img.getAttribute("alt")).toBe("");
    expect(root(container).getAttribute("aria-label")).toBe("Aroha Ngata");
  });

  it("falls back to initials when the image errors", async () => {
    stubImage("error");
    const { container } = renderUi(<Avatar src="/broken.png" name="Aroha Ngata" />);
    await vi.waitFor(() => expect(root(container).textContent).toBe("AN"));
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("Avatar: look", () => {
  it.each([
    ["sm", "size-6"],
    ["md", "size-10"],
    ["lg", "size-14"],
    ["xl", "size-20"],
  ] as const)("size %s is %s", (size, cls) => {
    const { container } = renderUi(<Avatar name="A B" size={size} />);
    expect(classes(root(container))).toContain(cls);
  });

  it("is a circle by default and can be a rounded square", () => {
    const circle = renderUi(<Avatar name="A B" />);
    expect(classes(root(circle.container))).toContain("rounded-full");
    const square = renderUi(<Avatar name="A B" shape="square" />);
    expect(classes(root(square.container))).toContain("rounded-md");
  });

  it("uses tokens, merges className and forwards the ref", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = renderUi(<Avatar ref={ref} name="A B" className="ring-2" />);
    expect(ref.current).toBe(root(container));
    expect(classes(root(container))).toEqual(expect.arrayContaining(["bg-muted", "ring-2"]));
  });
});

describe("AvatarGroup", () => {
  const people = ["Aroha Ngata", "Mere Walker", "Hemi Te Rangi", "Tane Smith", "Rangi Bell"];

  it("shows up to `max` avatars and a labelled +N for the rest", () => {
    const { container } = renderUi(
      <AvatarGroup max={3}>
        {people.map((p) => (
          <Avatar key={p} name={p} />
        ))}
      </AvatarGroup>,
    );
    const avatars = container.querySelectorAll("[role=img]");
    expect(avatars).toHaveLength(4); // three people plus the overflow
    const overflow = avatars[3] as HTMLElement;
    expect(overflow.textContent).toBe("+2");
    expect(overflow.getAttribute("aria-label")).toBe("2 more");
  });

  it("shows everyone when they fit, with no overflow", () => {
    const { container } = renderUi(
      <AvatarGroup max={5}>
        {people.map((p) => (
          <Avatar key={p} name={p} />
        ))}
      </AvatarGroup>,
    );
    expect(container.querySelectorAll("[role=img]")).toHaveLength(5);
    expect(container.textContent).not.toContain("+");
  });

  it("can localise the overflow label", () => {
    const { container } = renderUi(
      <AvatarGroup max={1} overflowLabel={(n) => `${n} atu`}>
        {people.map((p) => (
          <Avatar key={p} name={p} />
        ))}
      </AvatarGroup>,
    );
    expect(
      (container.querySelectorAll("[role=img]")[1] as HTMLElement).getAttribute("aria-label"),
    ).toBe("4 atu");
  });

  it("is a labelled group", () => {
    const { container } = renderUi(
      <AvatarGroup aria-label="Team">
        <Avatar name="A B" />
      </AvatarGroup>,
    );
    const group = container.firstElementChild as HTMLElement;
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Team");
  });
});

describe("Avatar: accessibility", () => {
  it("passes axe for a group", async () => {
    const { container } = renderUi(
      <AvatarGroup max={2} aria-label="Team">
        <Avatar name="Aroha Ngata" />
        <Avatar name="Mere Walker" />
        <Avatar name="Hemi Te Rangi" />
      </AvatarGroup>,
    );
    await expectNoA11yViolations(container);
  });
});
