import {
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Check, Circle, Eye, EyeOff } from "../../icons/glyphs.js";
import { Icon } from "../../icons/icon.js";
import { cn } from "../../lib/cn.js";
import type { InputProps } from "../input/input.js";
import { InputGroup, InputGroupButton, InputGroupInput } from "../input-group/input-group.js";
import {
  defaultPasswordScorer,
  type PasswordRequirement,
  type PasswordScore,
  type PasswordScorer,
} from "./strength.js";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /**
   * The toggle's accessible name. It stays the same; `aria-pressed` tells screen readers whether
   * the password is shown.
   * @default "Show password"
   */
  toggleLabel?: string;
  /** Whether the password starts shown. */
  defaultVisible?: boolean;
  /**
   * Whether the password is shown, for a controlled toggle. The password is hidden when its form
   * submits and `onVisibleChange(false)` is called: update `visible` from it, or the toggle will
   * still read as pressed.
   */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /**
   * Shows a strength meter under the input: `true` uses the small default scorer, or pass your
   * own, such as one built on zxcvbn-ts. Use it on new passwords only.
   */
  strength?: boolean | PasswordScorer;
  /**
   * Names for scores 0 to 4.
   * @default ["Very weak", "Weak", "Fair", "Strong", "Very strong"]
   */
  strengthLabels?: readonly [string, string, string, string, string];
  /**
   * Rules shown as a checklist under the input and ticked off as the password meets them. Changes
   * are announced politely. See `passwordRequirements` for ready-made rules.
   */
  requirements?: readonly PasswordRequirement[];
  /**
   * Words read after each rule, for screen readers.
   * @default { met: "done", unmet: "not done" }
   */
  requirementStatus?: { met: string; unmet: string };
}

const DEFAULT_LABELS = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const;
const DEFAULT_STATUS = { met: "done", unmet: "not done" } as const;
const SEGMENTS = [0, 1, 2, 3, 4] as const;

function segmentColour(score: PasswordScore): string {
  if (score <= 1) return "bg-destructive";
  if (score === 2) return "bg-warning";
  return "bg-success";
}

function assignRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * A password input with a show/hide toggle. `ref` is the real `<input>`, so `register()` works
 * with no `Controller`. Paste is never blocked and `autoComplete` defaults to `current-password`;
 * set `autoComplete="new-password"` on sign-up and change-password forms, where `strength` and
 * `requirements` belong. The password is hidden again when its form is submitted, so password
 * managers offer to save it.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      toggleLabel = "Show password",
      defaultVisible = false,
      visible: visibleProp,
      onVisibleChange,
      strength,
      strengthLabels = DEFAULT_LABELS,
      requirements,
      requirementStatus = DEFAULT_STATUS,
      className,
      value,
      defaultValue,
      onChange,
      disabled,
      autoComplete = "current-password",
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const [visibleState, setVisibleState] = useState(defaultVisible);
    const visible = visibleProp ?? visibleState;
    const setVisible = useCallback(
      (next: boolean) => {
        if (visibleProp === undefined) setVisibleState(next);
        onVisibleChange?.(next);
      },
      [visibleProp, onVisibleChange],
    );

    // The password, for the meter and checklist. Read from the input itself on mount, because
    // react-hook-form's defaultValues are written to the element without an event.
    const [typed, setTyped] = useState(defaultValue === undefined ? "" : String(defaultValue));
    const password = value === undefined ? typed : String(value);
    const element = useRef<HTMLInputElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        element.current = node;
        assignRef(ref, node);
      },
      [ref],
    );
    useEffect(() => {
      if (value === undefined && element.current) setTyped(element.current.value);
    }, [value]);

    function handleChange(event: Parameters<NonNullable<InputProps["onChange"]>>[0]) {
      setTyped(event.target.value);
      onChange?.(event);
    }

    // Hide the password before the form submits: a password manager only offers to save a
    // field that is type="password" at that moment.
    useEffect(() => {
      const form = element.current?.form;
      if (!form) return;
      const hide = () => {
        // Only when shown, so onVisibleChange doesn't fire on every submit.
        if (element.current?.type !== "text") return;
        element.current.type = "password";
        setVisible(false);
      };
      form.addEventListener("submit", hide, true);
      return () => form.removeEventListener("submit", hide, true);
    }, [setVisible]);

    const strengthId = useId();
    const requirementsId = useId();
    const scorer = strength === true ? defaultPasswordScorer : strength || undefined;
    const rated = scorer && password ? scorer(password) : undefined;

    const met = (requirements ?? []).map((rule) => rule.test(password));
    const metKey = met.map((ok) => (ok ? "1" : "0")).join("");
    const [announcement, setAnnouncement] = useState("");
    const previous = useRef(metKey);
    useEffect(() => {
      const before = previous.current;
      previous.current = metKey;
      if (!requirements || before === metKey || before.length !== metKey.length) return;
      const changed = requirements
        .map((rule, index) => ({ rule, ok: metKey[index] === "1", was: before[index] === "1" }))
        .filter(({ ok, was }) => ok !== was)
        .map(
          ({ rule, ok }) =>
            `${rule.label}: ${ok ? requirementStatus.met : requirementStatus.unmet}`,
        );
      setAnnouncement(changed.join(". "));
    }, [metKey, requirements, requirementStatus]);

    const ids = [
      describedBy,
      scorer ? strengthId : undefined,
      requirements?.length ? requirementsId : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        data-slot="password-input"
        className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      >
        <InputGroup>
          <InputGroupInput
            ref={setRefs}
            type={visible ? "text" : "password"}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            disabled={disabled}
            autoComplete={autoComplete}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={ids || undefined}
            {...props}
          />
          <InputGroupButton
            size="icon"
            aria-label={toggleLabel}
            aria-pressed={visible}
            disabled={disabled}
            onClick={() => setVisible(!visible)}
          >
            <Icon icon={visible ? EyeOff : Eye} size="sm" />
          </InputGroupButton>
        </InputGroup>

        {scorer ? (
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex flex-1 gap-1">
              {SEGMENTS.map((segment) => (
                <span
                  key={segment}
                  data-filled={rated && segment <= rated.score ? "" : undefined}
                  className={cn(
                    "h-1 flex-1 rounded-full bg-muted transition-colors duration-(--motion-duration-fast)",
                    rated && segment <= rated.score && segmentColour(rated.score),
                  )}
                />
              ))}
            </div>
            <p id={strengthId} className="min-w-24 text-end text-xs text-muted-foreground">
              {rated ? strengthLabels[rated.score] : ""}
            </p>
          </div>
        ) : null}
        {rated?.suggestion ? (
          <p className="text-xs text-muted-foreground">{rated.suggestion}</p>
        ) : null}

        {requirements?.length ? (
          <>
            <ul id={requirementsId} className="flex list-none flex-col gap-1 p-0 text-xs">
              {requirements.map((rule, index) => (
                <li
                  key={rule.id}
                  data-met={met[index] ? "" : undefined}
                  className={cn(
                    "flex items-center gap-1.5",
                    met[index] ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    icon={met[index] ? Check : Circle}
                    size="xs"
                    className={met[index] ? "text-success" : undefined}
                  />
                  {rule.label}
                  {/* Ends with a full stop so the rules don't run together when the list is read
                      as the input's description. */}
                  <span className="sr-only">
                    , {met[index] ? requirementStatus.met : requirementStatus.unmet}.{" "}
                  </span>
                </li>
              ))}
            </ul>
            <div aria-live="polite" className="sr-only">
              {announcement}
            </div>
          </>
        ) : null}
      </div>
    );
  },
);
