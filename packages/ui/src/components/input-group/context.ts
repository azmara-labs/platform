import { type AriaAttributes, createContext, useContext } from "react";

export type ForwardedAria = Pick<
  AriaAttributes,
  "aria-required" | "aria-errormessage" | "aria-invalid"
>;

export interface InputGroupContextValue extends ForwardedAria {
  /** Ids of the addons that describe the input, in the order they appear on screen. */
  describedBy: string | undefined;
  register: (id: string) => () => void;
}

// Its own module, so an input that only needs the context (NumberField) doesn't pull in the
// group's Button.
export const InputGroupContext = createContext<InputGroupContextValue | null>(null);

/**
 * The surrounding `InputGroup`, if any. Internal: lets other inputs (`NumberField`) sit inside a
 * group the way `InputGroupInput` does. Not exported from the package.
 */
export function useInputGroup(): InputGroupContextValue | null {
  return useContext(InputGroupContext);
}
