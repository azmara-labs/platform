import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import { Button } from "../button/button.js";
import { IconButton } from "../button/icon-button.js";
import { Fieldset } from "../form/fieldset.js";

type RowKey = string | number;

/** What each row's render function gets, besides the item itself. */
export interface FieldArrayRow {
  /** The row's position, from 0. */
  index: number;
  /** The row's stable key, from `getKey`. */
  key: RowKey;
  /** How many rows there are. */
  count: number;
  /** The row's name in announcements and button labels, such as "Line 2". */
  label: string;
  /** A field's path in this row: `name("qty")` is `"lines.1.qty"` when the array's `name` is `"lines"`. */
  name: (field: string) => string;
}

/** Every piece of text the component shows or announces, for translation. */
export interface FieldArrayMessages {
  /** The add button. Default "Add". */
  add: string;
  /** A row's remove button. Default "Remove {label}". */
  remove: (label: string) => string;
  /** A row's drag handle. Default "Move {label}". */
  move: (label: string) => string;
  moveUp: (label: string) => string;
  moveDown: (label: string) => string;
  /** Read with every drag handle. */
  moveHint: string;
  added: (label: string, count: number) => string;
  removed: (label: string, count: number) => string;
  moved: (label: string, position: number, count: number) => string;
}

const MESSAGES: FieldArrayMessages = {
  add: "Add",
  remove: (label) => `Remove ${label}`,
  move: (label) => `Move ${label}`,
  moveUp: (label) => `Move ${label} up`,
  moveDown: (label) => `Move ${label} down`,
  moveHint: "Use the up and down arrow keys to move it, or drag it.",
  added: (label, count) => `${label} added. ${count} ${count === 1 ? "row" : "rows"}.`,
  removed: (label, count) => `${label} removed. ${count} ${count === 1 ? "row" : "rows"} left.`,
  moved: (label, position, count) => `${label} moved to position ${position} of ${count}.`,
};

export interface FieldArrayProps<Item> {
  /** The group's caption, such as "Line items". */
  legend: ReactNode;
  description?: ReactNode;
  /** An error for the array as a whole, such as "Add at least one line". */
  error?: ReactNode;
  /** The rows. Each needs a stable key (see `getKey`) so focus and drag follow the right row. */
  items: readonly Item[];
  /** A row's stable key. Default: the item's `id`, then its `key`. Never the index. */
  getKey?: (item: Item, index: number) => RowKey;
  /** The array's path in the form values, used by `row.name()`. */
  name?: string;
  /** Renders one row's fields. */
  children: (item: Item, row: FieldArrayRow) => ReactNode;
  /** Adds a row at the end. Shows the add button; focus moves to the new row's first field. */
  onAdd?: () => void;
  /** Removes the row at `index`. Shows a remove button on each row. */
  onRemove?: (index: number) => void;
  /** Moves a row from one position to another. Shows a drag handle on each row. */
  onMove?: (from: number, to: number) => void;
  /** Fewest rows: remove buttons are disabled at this count. Default 0. */
  min?: number;
  /** Most rows: the add button is disabled at this count. */
  max?: number;
  /** Shown instead of the list when there are no rows. */
  empty?: ReactNode;
  /**
   * Column headings over the rows, for a table-like layout: lay them out on the same grid as each
   * row's fields. Hidden from screen readers, so every field still needs its own label (make it
   * visually hidden with `sr-only`). Not shown when there are no rows.
   */
  header?: ReactNode;
  /** Totals and other values computed from the rows, shown under them. */
  footer?: (items: readonly Item[]) => ReactNode;
  /** A row's name in announcements and button labels. Default "Row 1", "Row 2", ... */
  itemLabel?: (index: number, item: Item) => string;
  /**
   * Also show move up and move down buttons on each row. The drag handle's arrow keys already
   * move rows; buttons are easier to find, including for screen reader users in browse mode.
   */
  moveButtons?: boolean;
  disabled?: boolean;
  messages?: Partial<FieldArrayMessages>;
  className?: string;
}

const FOCUSABLE =
  'input:not([type="hidden"]), select, textarea, button, [contenteditable="true"], [tabindex]';

/** The first field a person would type into, skipping hidden and disabled controls. */
function firstField(row: HTMLElement | undefined): HTMLElement | undefined {
  const content = row?.querySelector<HTMLElement>('[data-slot="field-array-content"]');
  if (!content) return undefined;
  return Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
    (el) =>
      el.tabIndex >= 0 &&
      !(el as HTMLInputElement).disabled &&
      !el.closest('[aria-hidden="true"], [inert]'),
  );
}

function defaultKey(item: unknown, index: number): RowKey {
  const key =
    (item as { id?: RowKey } | null)?.id ?? (item as { key?: RowKey } | null)?.key ?? undefined;
  if (key === undefined) {
    throw new Error(
      `FieldArray: row ${index} has no \`id\` or \`key\`. Pass \`getKey\`; an index key would send focus and drag to the wrong row.`,
    );
  }
  return key;
}

type Pending =
  | { kind: "add"; before: Set<RowKey> }
  | { kind: "remove"; index: number; label: string }
  | { kind: "move"; key: RowKey; label: string; focus: "handle" | "up" | "down" };

interface Drag {
  key: RowKey;
  from: number;
  to: number;
  pointerId: number;
  startY: number;
  dy: number;
  /** Each row's vertical centre when the drag started, in list order. */
  centres: number[];
  startCentre: number;
  /** How far the other rows step aside: the dragged row's height plus the gap. */
  shift: number;
  active: boolean;
}

/** Pixels the pointer must travel before a press on the handle becomes a drag. */
const DRAG_THRESHOLD = 4;

// useLayoutEffect warns during server rendering in React 18; it only matters in the browser.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The position the dragged row lands in: one past every other row whose centre it has passed. */
function targetIndex(drag: Drag): number {
  const centre = drag.startCentre + drag.dy;
  return drag.centres.filter((other, index) => index !== drag.from && other < centre).length;
}

function rowOffset(drag: Drag | null, index: number): number {
  if (!drag?.active || index === drag.from) return 0;
  if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.shift;
  if (drag.to < drag.from && index >= drag.to && index < drag.from) return drag.shift;
  return 0;
}

/**
 * A repeating group of fields, such as invoice lines, contacts or addresses. Add, remove and
 * reorder rows by drag or keyboard, with minimum and maximum counts, an empty state and a footer
 * for totals. Focus follows every change (a new row's first field, the neighbour of a removed
 * row, the moved row's handle) and each change is announced. Form-library agnostic: use
 * `FormFieldArray` from `@azmr/ui/rhf` with React Hook Form.
 */
export function FieldArray<Item>({
  legend,
  description,
  error,
  items,
  getKey = defaultKey,
  name,
  children,
  onAdd,
  onRemove,
  onMove,
  min = 0,
  max,
  empty,
  header,
  footer,
  itemLabel = (index) => `Row ${index + 1}`,
  moveButtons = false,
  disabled = false,
  messages: messageOverrides,
  className,
}: FieldArrayProps<Item>) {
  const messages = { ...MESSAGES, ...messageOverrides };
  const hintId = useId();
  const rows = useRef(new Map<RowKey, HTMLLIElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLElement>(null);
  const pending = useRef<Pending | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const count = items.length;
  const entries = items.map((item, index) => ({
    item,
    index,
    key: getKey(item, index),
    label: itemLabel(index, item),
  }));
  const signature = entries.map((entry) => String(entry.key)).join("\u0000");
  const sortable = Boolean(onMove) && !disabled;
  const canAdd = Boolean(onAdd) && !disabled && (max === undefined || count < max);
  const canRemove = !disabled && count > min;

  // Same text twice is not re-announced, so alternate a trailing no-break space.
  const announce = (text: string) =>
    setAnnouncement((previous) => (previous === text ? `${text} ` : text));

  // Runs when the set or order of rows changes (by key), after the DOM has the new rows.
  useBrowserLayoutEffect(() => {
    const change = pending.current;
    if (!change) return;
    pending.current = null;
    if (change.kind === "add") {
      const added = entries.find((entry) => !change.before.has(entry.key));
      if (!added) return;
      firstField(rows.current.get(added.key))?.focus();
      announce(messages.added(added.label, count));
    } else if (change.kind === "remove") {
      const neighbour = entries.at(Math.min(change.index, count - 1));
      const target =
        (neighbour ? firstField(rows.current.get(neighbour.key)) : undefined) ??
        addButton.current ??
        group.current;
      target?.focus();
      announce(messages.removed(change.label, count));
    } else {
      const moved = entries.find((entry) => entry.key === change.key);
      if (!moved) return;
      const row = rows.current.get(moved.key);
      const pick = (slot: string) =>
        row?.querySelector<HTMLElement>(`[data-slot="field-array-${slot}"]:not([data-disabled])`);
      (pick(change.focus) ?? pick("handle") ?? pick("up") ?? pick("down"))?.focus();
      announce(messages.moved(change.label, moved.index + 1, count));
    }
  }, [signature]);

  type Entry = (typeof entries)[number];

  const add = () => {
    pending.current = { kind: "add", before: new Set(entries.map((entry) => entry.key)) };
    onAdd?.();
  };

  const remove = (entry: Entry) => {
    pending.current = { kind: "remove", index: entry.index, label: entry.label };
    onRemove?.(entry.index);
  };

  const move = (entry: Entry, to: number, focus: "handle" | "up" | "down") => {
    if (to < 0 || to >= count || to === entry.index) return;
    pending.current = { kind: "move", key: entry.key, label: entry.label, focus };
    onMove?.(entry.index, to);
  };

  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const onHandleKeyDown = (entry: Entry) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (dragRef.current) {
      if (event.key === "Escape") {
        event.preventDefault();
        updateDrag(null);
      }
      return;
    }
    const to =
      event.key === "ArrowUp"
        ? entry.index - 1
        : event.key === "ArrowDown"
          ? entry.index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : undefined;
    if (to === undefined) return;
    event.preventDefault();
    move(entry, to, "handle");
  };

  const onHandlePointerDown = (entry: Entry) => (event: PointerEvent<HTMLButtonElement>) => {
    const row = rows.current.get(entry.key);
    if (event.button !== 0 || !sortable || !row?.parentElement) return;
    const centres = Array.from(row.parentElement.children, (child) => {
      const rect = child.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    const rect = row.getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(row.parentElement).rowGap) || 0;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateDrag({
      key: entry.key,
      from: entry.index,
      to: entry.index,
      pointerId: event.pointerId,
      startY: event.clientY,
      dy: 0,
      centres,
      startCentre: rect.top + rect.height / 2,
      shift: rect.height + gap,
      active: false,
    });
  };

  const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const dy = event.clientY - current.startY;
    if (!current.active && Math.abs(dy) < DRAG_THRESHOLD) return;
    const next = { ...current, dy, active: true };
    updateDrag({ ...next, to: targetIndex(next) });
  };

  const onHandlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId) return;
    updateDrag(null);
    const entry = entries.find((candidate) => candidate.key === current.key);
    if (current.active && entry) move(entry, current.to, "handle");
  };

  const cancelDrag = () => {
    if (dragRef.current) updateDrag(null);
  };

  const rowStyle = (index: number): CSSProperties | undefined => {
    if (!drag?.active) return undefined;
    const y = index === drag.from ? drag.dy : rowOffset(drag, index);
    return y ? { transform: `translateY(${y}px)` } : undefined;
  };

  return (
    <Fieldset
      ref={group}
      legend={legend}
      description={description}
      error={error}
      disabled={disabled}
      tabIndex={-1}
      data-slot="field-array"
      className={cn("outline-none", className)}
    >
      {count === 0 ? (
        empty !== undefined ? (
          <div data-slot="field-array-empty" className="text-sm text-muted-foreground">
            {empty}
          </div>
        ) : null
      ) : (
        <>
          {header !== undefined ? (
            // Spacers the width of each row's buttons keep the headings over their columns.
            <div
              aria-hidden="true"
              data-slot="field-array-header"
              className="-mb-2 flex items-end gap-2 text-sm font-medium text-foreground"
            >
              {sortable ? <span className="w-8 shrink-0" /> : null}
              <div className="min-w-0 flex-1">{header}</div>
              {moveButtons && onMove ? <span className="w-[4.25rem] shrink-0" /> : null}
              {onRemove ? <span className="w-8 shrink-0" /> : null}
            </div>
          ) : null}
          <ul data-slot="field-array-list" className="m-0 flex list-none flex-col gap-3 p-0">
            {entries.map((entry) => {
              const { item, index, key, label } = entry;
              const dragging = drag?.active && drag.key === key;
              const row: FieldArrayRow = {
                index,
                key,
                count,
                label,
                name: (field) => (name ? `${name}.${index}.${field}` : `${index}.${field}`),
              };
              return (
                <li
                  key={key}
                  ref={(element) => {
                    if (element) rows.current.set(key, element);
                    else rows.current.delete(key);
                  }}
                  data-slot="field-array-row"
                  data-dragging={dragging ? "" : undefined}
                  style={rowStyle(index)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-md bg-background",
                    drag?.active && !dragging && "motion-safe:transition-transform",
                    dragging && "z-10 shadow-elevation-2",
                  )}
                >
                  {sortable ? (
                    <IconButton
                      data-slot="field-array-handle"
                      icon={<Icon icon={GripVertical} size="sm" />}
                      label={messages.move(label)}
                      aria-describedby={hintId}
                      size="sm"
                      className={cn(
                        "shrink-0 touch-none",
                        dragging ? "cursor-grabbing" : "cursor-grab",
                      )}
                      onKeyDown={onHandleKeyDown(entry)}
                      onPointerDown={onHandlePointerDown(entry)}
                      onPointerMove={onHandlePointerMove}
                      onPointerUp={onHandlePointerUp}
                      onPointerCancel={cancelDrag}
                      onLostPointerCapture={cancelDrag}
                    />
                  ) : null}
                  <div data-slot="field-array-content" className="min-w-0 flex-1">
                    {children(item, row)}
                  </div>
                  {moveButtons && onMove ? (
                    <div className="flex shrink-0 gap-1">
                      <IconButton
                        data-slot="field-array-up"
                        data-disabled={disabled || index === 0 ? "" : undefined}
                        icon={<Icon icon={ArrowUp} size="sm" />}
                        label={messages.moveUp(label)}
                        size="sm"
                        disabled={disabled || index === 0}
                        focusableWhenDisabled
                        onClick={() => move(entry, index - 1, "up")}
                      />
                      <IconButton
                        data-slot="field-array-down"
                        data-disabled={disabled || index === count - 1 ? "" : undefined}
                        icon={<Icon icon={ArrowDown} size="sm" />}
                        label={messages.moveDown(label)}
                        size="sm"
                        disabled={disabled || index === count - 1}
                        focusableWhenDisabled
                        onClick={() => move(entry, index + 1, "down")}
                      />
                    </div>
                  ) : null}
                  {onRemove ? (
                    <IconButton
                      data-slot="field-array-remove"
                      icon={<Icon icon={Trash2} size="sm" />}
                      label={messages.remove(label)}
                      size="sm"
                      className="shrink-0"
                      disabled={!canRemove}
                      focusableWhenDisabled
                      onClick={() => remove(entry)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {footer ? <div data-slot="field-array-footer">{footer(items)}</div> : null}
      {onAdd ? (
        <div>
          <Button
            ref={addButton}
            type="button"
            variant="outline"
            disabled={!canAdd}
            focusableWhenDisabled
            onClick={add}
          >
            <Icon icon={Plus} size="sm" />
            {messages.add}
          </Button>
        </div>
      ) : null}
      {sortable ? (
        <span id={hintId} hidden>
          {messages.moveHint}
        </span>
      ) : null}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </Fieldset>
  );
}
