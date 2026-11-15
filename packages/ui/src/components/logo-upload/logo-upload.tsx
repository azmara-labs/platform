"use client";

import {
  type DragEvent,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn.js";
import { Button } from "../button/index.js";
import { ShrinkError, type ShrinkErrorCode, shrinkImage } from "./shrink-image.js";

export interface LogoUploadProps {
  /**
   * The logo, for a controlled upload: a `data:` image or an `https:` URL. `null` or `""` means
   * none. Leave it out to let the component keep the value itself.
   */
  value?: string | null;
  /** The logo an uncontrolled upload starts with. */
  defaultValue?: string;
  /** Called with the new data URI after a good upload, and with `undefined` after Remove. */
  onValueChange?: (value: string | undefined) => void;
  /**
   * Called with a code when a file is refused, and with `undefined` when a later file or Remove
   * clears the error. The component also shows the matching text, so this is for your own
   * records or form state.
   */
  onError?: (code: ShrinkErrorCode | undefined) => void;
  /**
   * The most characters the finished data URI may have. Set it to your storage limit.
   * @default 32768
   */
  maxChars?: number;
  /** Adds a hidden input with this name that carries the value, for a native form post. */
  name?: string;
  disabled?: boolean;
  /** On the choose button, so a `Field` label points at it. */
  id?: string;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  "aria-errormessage"?: string;
  /** @default "Choose a logo" */
  chooseLabel?: string;
  /** @default "Replace logo" */
  replaceLabel?: string;
  /** @default "Remove logo" */
  removeLabel?: string;
  /** @default "or drop an image here" */
  dropLabel?: string;
  /** @default "Logo preview" */
  previewAlt?: string;
  /** @default "Preparing your logo..." */
  busyLabel?: string;
  /** @default "Logo ready" */
  readyLabel?: string;
  /** Text for each refusal. Anything you leave out uses the default. */
  errors?: Partial<Record<ShrinkErrorCode, string>>;
}

const DEFAULT_ERRORS: Record<ShrinkErrorCode, string> = {
  "not-an-image": "That file is not a PNG, JPEG or WebP image.",
  svg: "SVG logos cannot be used here. Export your logo as a PNG, JPEG or WebP.",
  "file-too-large": "That file is larger than 10 MB. Choose a smaller image.",
  "too-many-pixels": "That image is too large to open. Choose a smaller one.",
  "cannot-fit": "This logo cannot be made small enough. Try a simpler image.",
  "unsupported-browser": "This browser cannot prepare images. Try a current browser.",
};

// The theme's `MAX_DATA_URI_CHARS` (a test pins them together). Not imported: this component
// knows nothing about themes.
const DEFAULT_MAX_CHARS = 32_768;
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Whether a value is safe to put in an `<img src>`: a small data image or a plain https URL. */
function previewable(value: string): boolean {
  if (value.startsWith("data:")) return DATA_IMAGE.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

/**
 * Choose or drop a PNG, JPEG or WebP and get back a small `data:` URI. The file is checked from
 * its first bytes, decoded, then shrunk and re-encoded in the browser until it fits `maxChars`.
 * SVG is refused and nothing is fetched. It returns the string and stores nothing: saving it is
 * your app's job. `ref` and `id` are the choose button, so a `Field` label points at it.
 */
export const LogoUpload = forwardRef<HTMLButtonElement, LogoUploadProps>(function LogoUpload(
  {
    value,
    defaultValue,
    onValueChange,
    onError,
    maxChars = DEFAULT_MAX_CHARS,
    name,
    disabled = false,
    id,
    className,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    "aria-required": required,
    "aria-errormessage": errorMessage,
    chooseLabel = "Choose a logo",
    replaceLabel = "Replace logo",
    removeLabel = "Remove logo",
    dropLabel = "or drop an image here",
    previewAlt = "Logo preview",
    busyLabel = "Preparing your logo...",
    readyLabel = "Logo ready",
    errors,
  },
  ref,
) {
  const generated = useId();
  const buttonId = id ?? generated;
  const errorId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useImperativeHandle(ref, () => button.current as HTMLButtonElement);

  const [kept, setKept] = useState<string | undefined>(defaultValue || undefined);
  const current = value === undefined ? kept : value || undefined;
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState<ShrinkErrorCode>();
  const [dragging, setDragging] = useState(false);

  // Each choice takes a ticket; only the newest ticket may apply its result. Remove and unmount
  // take one too, so a slow file never lands after the person has moved on.
  const latest = useRef(0);
  useEffect(
    () => () => {
      latest.current += 1;
    },
    [],
  );

  const shownError = useRef<ShrinkErrorCode | undefined>(undefined);
  function report(next: ShrinkErrorCode | undefined) {
    if (next === undefined && shownError.current === undefined) return;
    shownError.current = next;
    setCode(next);
    onError?.(next);
  }

  async function choose(file: File) {
    const ticket = ++latest.current;
    setBusy(true);
    setReady(false);
    try {
      const result = await shrinkImage(file, maxChars);
      if (ticket !== latest.current) return;
      setBusy(false);
      report(undefined);
      if (value === undefined) setKept(result.dataUri);
      setReady(true);
      onValueChange?.(result.dataUri);
    } catch (error) {
      if (ticket !== latest.current) return;
      setBusy(false);
      report(error instanceof ShrinkError ? error.code : "not-an-image");
    }
  }

  function remove() {
    latest.current += 1;
    setBusy(false);
    setReady(false);
    report(undefined);
    if (value === undefined) setKept(undefined);
    onValueChange?.(undefined);
    button.current?.focus();
  }

  function onDragOver(event: DragEvent) {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    setDragging(true);
  }

  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!disabled && file) void choose(file);
  }

  const describedByIds = [describedBy, code ? errorId : undefined].filter(Boolean).join(" ");
  // A `Field` label names the control; keep the button's own text in the name too.
  const labelledByIds = labelledBy ? `${labelledBy} ${buttonId}` : undefined;

  return (
    <fieldset
      data-slot="logo-upload"
      data-dragging={dragging ? "" : undefined}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "m-0 flex w-full min-w-0 flex-wrap items-center gap-3 rounded-md border border-dashed border-input p-3",
        "transition-colors duration-(--motion-duration-fast) ease-standard",
        "data-[dragging]:border-ring data-[dragging]:bg-accent",
        className,
      )}
    >
      <input
        ref={fileInput}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Clear it so choosing the same file again still fires `change`.
          event.target.value = "";
          if (file) void choose(file);
        }}
      />
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
      {current !== undefined && previewable(current) ? (
        <img
          src={current}
          alt={previewAlt}
          className="h-16 max-w-40 rounded-md border border-input bg-background object-contain p-1"
        />
      ) : null}
      <Button
        ref={button}
        id={buttonId}
        type="button"
        variant="outline"
        disabled={disabled}
        loading={busy}
        aria-labelledby={labelledByIds}
        aria-describedby={describedByIds || undefined}
        aria-invalid={invalid || code ? true : undefined}
        aria-required={required || undefined}
        aria-errormessage={errorMessage}
        onClick={() => fileInput.current?.click()}
      >
        {current !== undefined ? replaceLabel : chooseLabel}
      </Button>
      {current !== undefined ? (
        <Button type="button" variant="ghost" disabled={disabled} onClick={remove}>
          {removeLabel}
        </Button>
      ) : null}
      <span className="text-sm text-muted-foreground">{dropLabel}</span>
      <p role="status" className="w-full text-sm text-muted-foreground empty:hidden">
        {busy ? busyLabel : ready ? readyLabel : ""}
      </p>
      {code ? (
        <p id={errorId} role="alert" className="w-full text-sm text-destructive">
          {errors?.[code] ?? DEFAULT_ERRORS[code]}
        </p>
      ) : null}
    </fieldset>
  );
});
