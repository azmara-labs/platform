import {
  type ComponentPropsWithoutRef,
  forwardRef,
  isValidElement,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn.js";

export interface ErrorSummaryItem {
  /** The field's `name`. Its link focuses the first visible control with that name. */
  name: string;
  message: ReactNode;
  /** The `id` of the control to focus instead, for a control without a `name`. */
  targetId?: string;
}

/**
 * Either a list of items, or an errors object keyed by field name: React Hook Form's
 * `formState.errors`, Base UI Form's `errors`, or a plain `{ email: "Enter an email address" }`.
 */
export type ErrorSummaryErrors = readonly ErrorSummaryItem[] | Readonly<Record<string, unknown>>;

export interface ErrorSummaryProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title" | "children"> {
  /** The errors to list. Nothing renders while there are none. */
  errors: ErrorSummaryErrors | null | undefined;
  /** @default "There is a problem" */
  title?: ReactNode;
  description?: ReactNode;
  /**
   * The number of submit attempts, such as React Hook Form's `formState.submitCount`. The summary
   * takes focus when it first shows errors, and again each time this changes while it has any.
   */
  submitCount?: number;
}

const isRootName = (name: string) => name === "root" || name.startsWith("root.");

function collect(value: unknown, name: string, out: ErrorSummaryItem[]): void {
  if (value === undefined || value === null || value === false || value === "") return;
  if (typeof value === "string" || typeof value === "number" || isValidElement(value)) {
    out.push({ name, message: value as ReactNode });
    return;
  }
  if (Array.isArray(value)) {
    // Base UI Form keeps a list of messages per field: show the first.
    if (value.every((entry) => typeof entry === "string")) {
      collect(value[0], name, out);
      return;
    }
    // React Hook Form field arrays: errors per row, plus a `root` error for the array itself.
    value.forEach((entry, index) => {
      collect(entry, `${name}.${index}`, out);
    });
    collect((value as { root?: unknown }).root, name, out);
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    // A React Hook Form error: a string `type`, or a `message` that isn't itself a nested error
    // (a group can have fields called "type" or "message"). One with no message can't be listed:
    // give every rule a message.
    const message = record.message;
    const leafMessage =
      "message" in record &&
      (message === null || typeof message !== "object" || isValidElement(message));
    if (name && (typeof record.type === "string" || leafMessage)) {
      collect(record.message, name, out);
      return;
    }
    for (const [key, entry] of Object.entries(record)) {
      collect(entry, name ? `${name}.${key}` : key, out);
    }
  }
}

/** Flattens any supported errors value into one item per message, in the order given. */
export function toErrorSummaryItems(
  errors: ErrorSummaryErrors | null | undefined,
): ErrorSummaryItem[] {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return (errors as readonly ErrorSummaryItem[]).filter(
      (item) => item.message !== undefined && item.message !== null && item.message !== "",
    );
  }
  const items: ErrorSummaryItem[] = [];
  collect(errors, "", items);
  return items;
}

const FOCUSABLE =
  'input, select, textarea, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function isFocusable(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && el.type === "hidden") return false;
  if ((el as HTMLInputElement).disabled) return false;
  if (el.closest('[aria-hidden="true"], [inert]')) return false;
  return el.tabIndex >= 0;
}

function findTarget(scope: ParentNode, doc: Document, item: ErrorSummaryItem): HTMLElement | null {
  if (item.targetId) {
    const el = doc.getElementById(item.targetId);
    if (el) return el;
  }
  const named = Array.from(
    scope.querySelectorAll<HTMLElement>(`[name="${item.name.replace(/["\\]/g, "\\$&")}"]`),
  );
  const direct = named.find(isFocusable);
  if (direct) return direct;
  // Base UI's Select, Radio and Checkbox keep the `name` on a hidden input beside the control
  // people actually use: take the nearest focusable element around it.
  for (const hidden of named) {
    for (let el = hidden.parentElement; el && el !== scope; el = el.parentElement) {
      const near = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).find(isFocusable);
      if (near) return near;
      if (el.tagName === "FIELDSET" || el.tagName === "FORM") break;
    }
  }
  return null;
}

/** What to scroll into view: the group's legend for a radio or checkbox, otherwise the label. */
function captionFor(target: HTMLElement, doc: Document): HTMLElement | null {
  const role = target.getAttribute("role");
  const type = (target as HTMLInputElement).type;
  const choice = role === "radio" || role === "checkbox" || type === "radio" || type === "checkbox";
  const fieldset = choice ? target.closest("fieldset") : null;
  if (fieldset) {
    const legend =
      fieldset.querySelector("legend") ??
      doc.getElementById(fieldset.getAttribute("aria-labelledby") ?? "");
    if (legend) return legend;
  }
  const labelledBy = target.getAttribute("aria-labelledby")?.split(" ")[0];
  return (
    (target as HTMLInputElement).labels?.[0] ?? (labelledBy ? doc.getElementById(labelledBy) : null)
  );
}

const NOT_YET = Symbol("not yet focused");

// useLayoutEffect warns during server rendering in React 18; it only matters in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The items in the order their fields appear in the document, with form-level (`root`) errors
 * first and anything without a field last. Errors can arrive in another order, for example when
 * an async check finishes after the rest.
 */
function inDocumentOrder(
  items: readonly ErrorSummaryItem[],
  summary: HTMLElement,
): ErrorSummaryItem[] {
  const doc = summary.ownerDocument;
  const scope = summary.closest("form") ?? doc;
  const placed = items.map((item, index) => ({
    item,
    index,
    root: isRootName(item.name),
    target: isRootName(item.name) ? null : findTarget(scope, doc, item),
  }));
  placed.sort((a, b) => {
    if (a.root !== b.root) return a.root ? -1 : 1;
    if (a.target && b.target && a.target !== b.target) {
      return a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    }
    if (a.target && !b.target) return -1;
    if (!a.target && b.target) return 1;
    return a.index - b.index;
  });
  return placed.map(({ item }) => item);
}

/**
 * Lists a form's errors after a failed submit, each one a link that moves focus to its field
 * (the GOV.UK error summary pattern, for WCAG 3.3.1 and 3.3.3). Place it at the top of the form.
 * It takes focus when errors arrive so keyboard and screen reader users start from the list, and
 * renders nothing while there are none. Errors with a `root` name (React Hook Form's form-level
 * errors) are listed without a link.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, title = "There is a problem", description, submitCount, className, ...props },
  ref,
) {
  const titleId = useId();
  const element = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => element.current as HTMLDivElement, []);
  const given = toErrorSummaryItems(errors);
  const shown = given.length > 0;

  // Reorder to match the fields on the page, before paint, so the list never jumps.
  const givenKey = given.map((item) => `${item.name}\u0000${String(item.message)}`).join("\u0001");
  const [order, setOrder] = useState<{ key: string; names: string[] } | null>(null);
  useBrowserLayoutEffect(() => {
    const summary = element.current;
    if (!summary || given.length < 2) return;
    const names = inDocumentOrder(given, summary).map((item) => item.name);
    if (names.join("\u0000") !== given.map((item) => item.name).join("\u0000")) {
      setOrder({ key: givenKey, names });
    }
  }, [givenKey]);
  const items =
    order && order.key === givenKey
      ? order.names
          .map((name) => given.find((item) => item.name === name))
          .filter((item): item is ErrorSummaryItem => item !== undefined)
      : given;
  const focusedFor = useRef<number | undefined | typeof NOT_YET>(NOT_YET);

  useEffect(() => {
    if (!shown || focusedFor.current === submitCount) return;
    focusedFor.current = submitCount;
    element.current?.focus();
  }, [shown, submitCount]);

  if (!shown) return null;

  function onLinkClick(event: MouseEvent<HTMLAnchorElement>, item: ErrorSummaryItem) {
    const summary = element.current;
    if (!summary) return;
    const doc = summary.ownerDocument;
    const target = findTarget(summary.closest("form") ?? doc, doc, item);
    // Not found: leave the link to its `href`.
    if (!target) return;
    event.preventDefault();
    // Scroll the caption into view as well, so people see what the field is for. Centred, so a
    // sticky page header can't cover it.
    (captionFor(target, doc) ?? target).scrollIntoView?.({ block: "center" });
    target.focus({ preventScroll: true });
  }

  return (
    <div
      ref={element}
      role="alert"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        "flex flex-col gap-3 rounded-md border-2 border-destructive bg-background p-4 text-foreground",
        "outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className,
      )}
      {...props}
    >
      <h2 id={titleId} className="text-base font-semibold leading-tight">
        {title}
      </h2>
      {description !== undefined ? <p className="text-sm">{description}</p> : null}
      <ul className="flex list-none flex-col gap-1.5 p-0 text-sm font-medium">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: names can repeat, and the list is rebuilt each render
          <li key={`${item.name}-${index}`}>
            {isRootName(item.name) ? (
              <span className="text-destructive">{item.message}</span>
            ) : (
              <a
                href={`#${item.targetId ?? item.name}`}
                onClick={(event) => onLinkClick(event, item)}
                className="text-destructive underline underline-offset-4 hover:decoration-2 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});
