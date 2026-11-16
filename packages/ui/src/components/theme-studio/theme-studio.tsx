import { type FormEvent, type KeyboardEvent, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn.js";
import type { ThemeConfig } from "../../theme/index.js";
import { Button } from "../button/index.js";
import { Alert } from "../display/index.js";
import { Field } from "../field/index.js";
import { Fieldset } from "../form/index.js";
import { ColourInput, Input } from "../input/index.js";
import { LogoUpload, type LogoUploadProps } from "../logo-upload/index.js";
import { ToggleGroup, ToggleGroupItem } from "../toggle/index.js";
import { DEFAULT_MESSAGES, fill, type StudioMessages } from "./messages.js";
import {
  type ColourNote,
  draftFromConfig,
  evaluateDraft,
  isDirty,
  type StudioDraft,
  type StudioField,
  type StudioResult,
} from "./studio-model.js";
import { ThemePreview } from "./theme-preview.js";

type LogoLabels = Pick<
  LogoUploadProps,
  | "chooseLabel"
  | "replaceLabel"
  | "removeLabel"
  | "dropLabel"
  | "previewAlt"
  | "busyLabel"
  | "readyLabel"
  | "requiredLabel"
  | "errors"
>;

export interface ThemeStudioProps {
  /**
   * The current theme, or none. Reset returns to it. When the host passes a new value (after a
   * save, say) it becomes the new starting point: the fields show it and there are no changes.
   */
  value?: ThemeConfig;
  /**
   * Called with the validated config when the admin saves. It may return a promise; if that
   * rejects, the studio says the save failed and keeps what was typed. Storing the config is the
   * host's job.
   */
  onSave: (config: ThemeConfig) => void | Promise<void>;
  /** Disables every control, for example while the host loads the theme. */
  disabled?: boolean;
  /** Text for the screen. Anything left out uses the English default. */
  messages?: Partial<StudioMessages>;
  /** Text for the two logo uploads: their buttons, drop hint and refusal messages. */
  logoLabels?: Partial<LogoLabels>;
  className?: string;
}

type Good = Extract<StudioResult, { ok: true }>;

/** JSON with object keys in a fixed order, so equal content is equal text whatever order a database returns it in. */
function stableKey(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}

function noteText(note: ColourNote | undefined, text: StudioMessages): string | undefined {
  if (!note) return undefined;
  if (note.kind === "readable") return text.statusReadable;
  if (note.kind === "button") return text.statusButtonAdjusted;
  if (note.kind === "dark-derived") return fill(text.statusDarkDerived, { shade: note.shade });
  return fill(text.statusAdjusted, { shade: note.shade });
}

/**
 * Brand settings for a business admin: app name, a brand colour for light and for dark, and
 * logos, with a live preview. It returns a validated `ThemeConfig` through `onSave` and keeps
 * every setting it does not show. It does not save, fetch or apply the theme to your app.
 */
export function ThemeStudio({
  value,
  onSave,
  disabled,
  messages,
  logoLabels,
  className,
}: ThemeStudioProps) {
  const text = useMemo(() => ({ ...DEFAULT_MESSAGES, ...messages }), [messages]);
  const headingId = useId();

  const baseKey = stableKey(value);
  const [seenKey, setSeenKey] = useState(baseKey);
  const [draft, setDraft] = useState<StudioDraft>(() => draftFromConfig(value));
  // The field being typed in: its error waits until the admin leaves it or presses Enter.
  const [editing, setEditing] = useState<StudioField>();
  const [busy, setBusy] = useState({ logo: false, logoDark: false });
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [good, setGood] = useState<Good>();
  // Bumped on Reset and on a new baseline, so a logo still being prepared is discarded with its control.
  const [generation, setGeneration] = useState(0);

  // A new `value` from the host (after a save) is the new baseline.
  const rebasing = seenKey !== baseKey;
  if (rebasing) {
    setSeenKey(baseKey);
    setGood(undefined);
    setGeneration((g) => g + 1);
    setBusy({ logo: false, logoDark: false });
    setDraft(draftFromConfig(value));
    setEditing(undefined);
    setSaveFailed(false);
  }

  const result = useMemo(() => evaluateDraft(value, draft, text), [value, draft, text]);
  // An invalid draft keeps the last good preview.
  if (!rebasing && result.ok && good !== result) setGood(result);
  const shown = rebasing ? undefined : result.ok ? result : good;

  const errors = result.ok ? {} : result.errors;
  const conflict = result.ok ? undefined : result.conflict;
  const dirty = isDirty(value, draft);
  const preparing = busy.logo || busy.logoDark;
  const locked = disabled || saving;
  const cannotSave = disabled || !dirty || !result.ok || preparing;

  const track = (field: StudioField) => ({
    onFocus: () => setEditing(field),
    onBlur: () => setEditing((now) => (now === field ? undefined : now)),
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter") setEditing(undefined);
    },
  });
  const set = (key: keyof StudioDraft, next: string | undefined) =>
    setDraft((d) => ({ ...d, [key]: next ?? "" }));
  const shownError = (field: StudioField) => (editing === field ? undefined : errors[field]);
  const note = (which: "light" | "dark") =>
    result.ok
      ? noteText(
          result.notes.find((n) => n.mode === which),
          text,
        )
      : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (cannotSave || saving || !result.ok) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await onSave(result.config);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDraft(draftFromConfig(value));
    setGeneration((g) => g + 1);
    setBusy({ logo: false, logoDark: false });
    setEditing(undefined);
    setSaveFailed(false);
  }

  const branding = shown
    ? shown.config.branding
    : { appName: draft.appName, logo: draft.logo, logoDark: draft.logoDark };

  return (
    <div
      data-slot="theme-studio"
      className={cn("grid gap-6 lg:grid-cols-2 lg:items-start", className)}
    >
      <form noValidate onSubmit={submit} className="flex min-w-0 flex-col gap-6">
        <Field
          label={text.appNameLabel}
          description={text.appNameHelp}
          error={shownError("appName")}
        >
          <Input
            value={draft.appName}
            onValueChange={(next) => set("appName", next)}
            {...track("appName")}
            disabled={locked}
            autoComplete="off"
          />
        </Field>

        <Fieldset legend={text.lightHeading} disabled={locked}>
          <Field label={text.brandLabel} description={note("light")} error={shownError("brand")}>
            {(control) => (
              <ColourInput
                {...control}
                swatchLabel={text.lightSwatch}
                value={draft.brand}
                onValueChange={(next) => set("brand", next)}
                {...track("brand")}
                disabled={locked}
              />
            )}
          </Field>
          <Field label={text.logoLabel}>
            {(control) => (
              <LogoUpload
                {...control}
                {...logoLabels}
                key={generation}
                value={draft.logo || undefined}
                onValueChange={(next) => set("logo", next)}
                onBusyChange={(on) => setBusy((b) => ({ ...b, logo: on }))}
                disabled={locked}
              />
            )}
          </Field>
        </Fieldset>

        <Fieldset legend={text.darkHeading} description={text.darkOptional} disabled={locked}>
          <Field label={text.brandLabel} description={note("dark")} error={shownError("brandDark")}>
            {(control) => (
              <ColourInput
                {...control}
                swatchLabel={text.darkSwatch}
                value={draft.brandDark}
                onValueChange={(next) => set("brandDark", next)}
                {...track("brandDark")}
                disabled={locked}
              />
            )}
          </Field>
          <Field label={text.logoLabel}>
            {(control) => (
              <LogoUpload
                {...control}
                {...logoLabels}
                key={generation}
                value={draft.logoDark || undefined}
                onValueChange={(next) => set("logoDark", next)}
                onBusyChange={(on) => setBusy((b) => ({ ...b, logoDark: on }))}
                disabled={locked}
              />
            )}
          </Field>
        </Fieldset>

        {conflict ? (
          <div className="flex flex-col gap-2">
            <Alert variant="warning">
              <p>
                {conflict.roles.length > 0
                  ? fill(text.conflict, { roles: conflict.roles.join(", ") })
                  : text.conflictNoRole}
              </p>
            </Alert>
            {/* Outside the alert: the ratios change as a colour is dragged and must not be re-announced. */}
            <p className="text-xs text-muted-foreground">
              {fill(text.conflictDetails, { issues: conflict.issues.join(" ") })}
            </p>
          </div>
        ) : null}
        {saveFailed ? <Alert variant="destructive">{text.saveFailed}</Alert> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={saving ? false : cannotSave}
            loading={saving}
            loadingText={text.saving}
          >
            {text.save}
          </Button>
          <Button type="button" variant="outline" disabled={locked || !dirty} onClick={reset}>
            {text.reset}
          </Button>
        </div>
      </form>

      <section
        aria-labelledby={headingId}
        className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={headingId} className="text-base font-semibold">
            {text.preview}
          </h2>
          <ToggleGroup
            aria-label={text.previewMode}
            value={[mode]}
            onValueChange={(next: unknown) => {
              const picked = Array.isArray(next) ? next[0] : undefined;
              if (picked === "light" || picked === "dark") setMode(picked);
            }}
            variant="outline"
          >
            <ToggleGroupItem value="light">{text.modeLight}</ToggleGroupItem>
            <ToggleGroupItem value="dark">{text.modeDark}</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ThemePreview
          cssVariables={shown?.cssVariables ?? {}}
          mode={mode}
          appName={branding?.appName}
          logo={branding?.logo}
          logoDark={branding?.logoDark}
          messages={text}
        />
      </section>
    </div>
  );
}
