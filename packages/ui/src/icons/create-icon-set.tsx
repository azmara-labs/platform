import { forwardRef } from "react";
import { Icon } from "./icon.js";
import { assertIconEntry, warnMissingIcon } from "./registry.js";
import type { IconComponent, IconProps } from "./types.js";

export type SetIconProps<Name extends string> = Omit<IconProps, "icon" | "name"> & { name: Name };

/**
 * Builds an `<Icon name="...">` bound to a fixed set of icons, with the names type-checked.
 * Unlike `registerIcons`, nothing is global and only the icons you list are bundled.
 *
 * ```tsx
 * const { Icon } = createIconSet({ check: Check, "my-logo": MyLogo });
 * <Icon name="check" />
 * ```
 */
export function createIconSet<const T extends Record<string, IconComponent>>(icons: T) {
  for (const [name, component] of Object.entries(icons)) assertIconEntry(name, component);
  // A snapshot: mutating the object passed in later cannot change the set.
  const own: Readonly<Record<string, IconComponent>> = Object.freeze({ ...icons });
  const names = Object.freeze(Object.keys(own)) as readonly (keyof T & string)[];

  // biome-ignore lint/correctness/noComponentHookFactories: a factory by design; callers build the component once, at module level
  const SetIcon = forwardRef<SVGSVGElement, SetIconProps<keyof T & string>>(function SetIcon(
    { name, ...props },
    ref,
  ) {
    const icon = Object.hasOwn(own, name) ? own[name] : undefined;
    if (!icon) {
      warnMissingIcon(name);
      return null;
    }
    return <Icon ref={ref} icon={icon} {...props} />;
  });

  return { Icon: SetIcon, names };
}
