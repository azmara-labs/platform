import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog.js";

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);
const alert = () => document.querySelector("[role=alertdialog]") as HTMLElement | null;
const trigger = (container: HTMLElement) => container.querySelector("button") as HTMLButtonElement;
const inAlert = (label: string) =>
  Array.from(document.querySelectorAll("[role=alertdialog] button")).find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement;

function Demo(props: { onConfirm?: () => void; tone?: "default" | "destructive" }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete project</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction tone={props.tone} onClick={props.onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("is an alert dialog, named by its title and described by its description", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    expect(alert()).toBeNull();
    await user.click(trigger(container));
    const a = alert() as HTMLElement;
    expect(a).not.toBeNull();
    expect(document.getElementById(a.getAttribute("aria-labelledby") as string)?.textContent).toBe(
      "Delete this project?",
    );
    expect(document.getElementById(a.getAttribute("aria-describedby") as string)?.textContent).toBe(
      "This cannot be undone.",
    );
  });

  it("puts focus on the least destructive choice (Cancel), never on the destructive action", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await vi.waitFor(() => expect(document.activeElement).toBe(inAlert("Keep it")));
  });

  it("still starts on Cancel when the destructive action comes first in the page order", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <AlertDialog>
        <AlertDialogTrigger>Delete project</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this project?</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogAction>Delete</AlertDialogAction>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(trigger(container));
    await vi.waitFor(() => expect(document.activeElement).toBe(inAlert("Keep it")));
  });

  it("falls back to the first control when there is no Cancel", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Heads up</AlertDialogTitle>
          <AlertDialogAction tone="default">Got it</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(trigger(container));
    await vi.waitFor(() => expect(document.activeElement).toBe(inAlert("Got it")));
  });

  it("does not close on an outside click: the user must choose", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await user.click(document.querySelector("[data-azmr-backdrop]") as HTMLElement);
    await new Promise((r) => setTimeout(r, 60));
    expect(alert()).not.toBeNull();
  });

  it("closes on Escape (as a cancel) and returns focus to the trigger", async () => {
    const user = setupUser();
    const onConfirm = vi.fn();
    const { container } = renderUi(<Demo onConfirm={onConfirm} />);
    await user.click(trigger(container));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => expect(alert()).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger(container));
  });

  it("Cancel closes without confirming", async () => {
    const user = setupUser();
    const onConfirm = vi.fn();
    const { container } = renderUi(<Demo onConfirm={onConfirm} />);
    await user.click(trigger(container));
    await user.click(inAlert("Keep it"));
    await vi.waitFor(() => expect(alert()).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("the action confirms once and closes", async () => {
    const user = setupUser();
    const onConfirm = vi.fn();
    const { container } = renderUi(<Demo onConfirm={onConfirm} />);
    await user.click(trigger(container));
    await user.click(inAlert("Delete"));
    await vi.waitFor(() => expect(alert()).toBeNull());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps focus inside while open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    for (let i = 0; i < 6; i++) {
      await user.tab();
      // At the end focus hops via a guard element and is sent back on the next tick.
      await vi.waitFor(() =>
        expect(alert()?.contains(document.activeElement), `Tab #${i + 1}`).toBe(true),
      );
    }
  });

  it("the action is destructive by default and can be made neutral", async () => {
    const user = setupUser();
    const a = renderUi(<Demo />);
    await user.click(trigger(a.container));
    expect(classes(inAlert("Delete"))).toContain("bg-destructive");
    expect(classes(inAlert("Keep it"))).toContain("border-input");
    a.unmount();
    const b = renderUi(<Demo tone="default" />);
    await user.click(trigger(b.container));
    expect(classes(inAlert("Delete"))).toContain("bg-primary");
    expect(classes(inAlert("Delete"))).not.toContain("bg-destructive");
  });

  it("declares itself modal for assistive technology", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(alert()?.getAttribute("aria-modal")).toBe("true");
  });

  it("has no corner close button (the choice is the buttons)", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(inAlert("Close")).toBeUndefined();
  });

  it("is a narrow, modal surface above the scrim", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    expect(classes(alert())).toEqual(
      expect.arrayContaining([
        "max-w-md",
        "bg-background",
        "shadow-elevation-4",
        "duration-(--motion-duration-base)",
      ]),
    );
    expect(classes(document.querySelector("[data-azmr-backdrop]"))).toContain("bg-scrim");
  });

  it("passes axe open", async () => {
    const user = setupUser();
    const { container } = renderUi(<Demo />);
    await user.click(trigger(container));
    await vi.waitFor(() => expect(alert()).not.toBeNull());
    await expectNoA11yViolations(document.body);
  });
});
