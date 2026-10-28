import { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { describeDebounceContract, renderUi, setupUser } from "../../test-utils/index.js";
import { Input } from "./input.js";

describeDebounceContract("Input", {
  render: (props) => {
    const { container, unmount } = renderUi(<Input aria-label="Search" {...props} />);
    return { input: container.querySelector("input") as HTMLInputElement, unmount };
  },
  sample: { text: "kiwi", value: "kiwi" },
});

describe("Input: debounce details", () => {
  it("keeps the native onChange immediate, so register() sees every keystroke", async () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      const user = setupUser({ advanceTimers: vi.advanceTimersByTime, delay: null });
      const { container } = renderUi(
        <Input aria-label="n" debounceMs={300} onChange={onChange} onValueChange={onValueChange} />,
      );
      await user.type(container.querySelector("input") as HTMLInputElement, "abc");
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onValueChange).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("still calls onBlur and onKeyDown given to it", async () => {
    const onBlur = vi.fn();
    const onKeyDown = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Input aria-label="n" onBlur={onBlur} onKeyDown={onKeyDown} />);
    const input = container.querySelector("input") as HTMLInputElement;
    await user.type(input, "a{Enter}");
    act(() => input.blur());
    expect(onKeyDown).toHaveBeenCalledTimes(2);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("doesn't commit on Enter while an input method is composing", () => {
    const onCommit = vi.fn();
    const { container } = renderUi(<Input aria-label="n" defaultValue="" onCommit={onCommit} />);
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.focus();
      // The native setter, so React's value tracking sees the change as typing would.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        input,
        "にほん",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
      );
    });
    expect(onCommit).not.toHaveBeenCalled();
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(onCommit).toHaveBeenCalledWith("にほん");
  });

  it("doesn't commit the starting value, or report a controlled value set from outside", async () => {
    const onCommit = vi.fn();
    const onValueChange = vi.fn();
    const { container, rerender } = renderUi(
      <Input aria-label="n" value="a" onValueChange={onValueChange} onCommit={onCommit} />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => input.focus());
    act(() => input.blur());
    expect(onCommit).not.toHaveBeenCalled();
    rerender(<Input aria-label="n" value="b" onValueChange={onValueChange} onCommit={onCommit} />);
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => input.focus());
    act(() => input.blur());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits a controlled value the person typed", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("");
      return <Input aria-label="n" value={value} onValueChange={setValue} onCommit={onCommit} />;
    }
    const { container } = renderUi(<Controlled />);
    const input = container.querySelector("input") as HTMLInputElement;
    await user.type(input, "kia ora");
    act(() => input.blur());
    expect(onCommit.mock.calls).toEqual([["kia ora"]]);
  });
});
