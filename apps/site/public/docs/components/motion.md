# Motion

> CSS-first motion presets driven by tokens, a Collapse that never measures height, a count-up, a ViewTransition wrapper, useReducedMotion and an optional module for the motion library. Reduced motion is built in.

Source: https://platform.azmara.io/docs/components/motion

Group: Utils · Status: new · Added in @azmr/ui 0.2.0

## Principles

- **CSS first.** Motion is a class or a `data-*` state, with its duration and easing from tokens (`--motion-duration-*`, `--motion-ease-*`). Changing a token or turning on reduced motion changes it everywhere.
- **Cheap properties only.** Animations change `transform`, `scale`, `opacity` and `clip-path`; collapse animates `grid-template-rows`; the tick draws with `stroke-dashoffset`. Nothing animates `width`, `height`, `margin` or position, because those make the browser re-layout every frame. A test scans the CSS and every component and fails on a layout animation that is not on a documented exception list.
- **Reduced motion is the default behaviour, not an extra.** Under `prefers-reduced-motion: reduce` the durations collapse to near zero, every slide and scale becomes a plain fade, staggers lose their delays, the shimmer stops and the tick appears at once.

The presets ship in `@azmr/ui/styles.css`. If you import only `tokens.css`, they are not included.

## Presets

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { motionPresets } from "@azmr/ui/presets";
import { useState } from "react";

const tiles = [
  ["Fade", motionPresets.fade.enter],
  ["Scale", motionPresets.scale.enter],
  ["Slide up", motionPresets.slideUp.enter],
  ["Slide down", motionPresets.slideDown.enter],
  ["Slide left", motionPresets.slideLeft.enter],
  ["Slide right", motionPresets.slideRight.enter],
] as const;

export default function MotionGallery() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-4">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, cls]) => (
          // The key restarts the animation each time Replay is pressed.
          <div
            key={`${label}-${run}`}
            className={`${cls} flex h-16 w-32 items-center justify-center rounded-md border border-border bg-card text-sm`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Each preset is a pair of classes, `enter` and `exit`. `enter` eases out and runs on `--motion-duration-base` (200 ms); `exit` is shorter (`--motion-duration-fast`, 150 ms) and eases in, because people wait for things to appear but not to disappear.

| Preset                      | Classes                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Fade                        | `motion-fade-in`, `motion-fade-out`                                                   |
| Scale                       | `motion-scale-in`, `motion-scale-out`                                                 |
| Slide up, down, left, right | `motion-slide-up-in`, `motion-slide-up-out`, and the same for `down`, `left`, `right` |
| Shimmer                     | `motion-shimmer`                                                                      |

Use the classes directly, or take them from `motionPresets` (typed, so a typo is a compile error):

```tsx
import { motionPresets } from "@azmr/ui/presets";

<div className={motionPresets.slideUp.enter}>…</div>
```

For Base UI parts (dialogs, menus, popovers) the library already animates with `data-starting-style` and `data-ending-style` on the same tokens; these presets are for your own elements.

## Collapse

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { Collapse } from "@azmr/ui/presets";
import { useId, useState } from "react";

export default function CollapseDemo() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Button
        variant="outline"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide details" : "Show details"}
      </Button>
      <Collapse id={id} open={open}>
        <p className="text-sm text-muted-foreground">
          This panel animates its height by moving grid-template-rows between 0fr and 1fr, so no
          height is ever measured in JavaScript. While it is closed it is inert: its content cannot
          be focused or read.
        </p>
        <Button size="sm" className="mt-3">
          A focusable control
        </Button>
      </Collapse>
    </div>
  );
}
```

`Collapse` shows and hides content by animating `grid-template-rows` between `0fr` and `1fr`, so **no height is measured in JavaScript**. It is a Server Component. The content stays mounted while closed (so it keeps its state) and is `inert` and `aria-hidden`, so it cannot be focused or read.

You own the trigger: give it `aria-expanded` and `aria-controls` pointing at the collapse's `id`, as in the demo. For a ready-made disclosure with all of that wired, use `Collapsible` or `Accordion`; they measure the panel through Base UI instead (a documented exception to the cheap-properties rule).

| Prop       | Type        | Default | Required | Description                     |
| ---------- | ----------- | ------- | -------- | ------------------------------- |
| `open`     | `boolean`   |         | Yes      | Whether the content is showing. |
| `children` | `ReactNode` |         | Yes      |                                 |

## Stagger

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { Stagger } from "@azmr/ui/presets";
import { useState } from "react";

const items = ["Design tokens", "Components", "Accessibility", "Motion", "Docs"];

export default function StaggerDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <Stagger key={run} as="ul" className="flex flex-col gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-border bg-card px-3 py-2">
            {item}
          </li>
        ))}
      </Stagger>
    </div>
  );
}
```

`Stagger` makes the children of a list enter one after another. Each child gets a `--stagger-index`, and the delay is the index times `--motion-stagger-step` (40 ms), capped at `max` (12) so a long list does not take seconds to appear. Under reduced motion the step is zero and they fade in together. It is a Server Component; only element children are staggered.

| Prop       | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Default | Required | Description                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- | --------------------------------------------------------------------------------------------------- |
| `as`       | `"symbol" \| "object" \| "slot" \| "style" \| "title" \| "a" \| "abbr" \| "address" \| "area" \| "article" \| "aside" \| "audio" \| "b" \| "base" \| "bdi" \| "bdo" \| "big" \| "blockquote" \| "body" \| "br" \| "button" \| "canvas" \| "caption" \| "center" \| "cite" \| "code" \| "col" \| "colgroup" \| "data" \| "datalist" \| "dd" \| "del" \| "details" \| "dfn" \| "dialog" \| "div" \| "dl" \| "dt" \| "em" \| "embed" \| "fieldset" \| "figcaption" \| "figure" \| "footer" \| "form" \| "h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "head" \| "header" \| "hgroup" \| "hr" \| "html" \| "i" \| "iframe" \| "img" \| "input" \| "ins" \| "kbd" \| "keygen" \| "label" \| "legend" \| "li" \| "link" \| "main" \| "map" \| "mark" \| "menu" \| "menuitem" \| "meta" \| "meter" \| "nav" \| "noindex" \| "noscript" \| "ol" \| "optgroup" \| "option" \| "output" \| "p" \| "param" \| "picture" \| "pre" \| "progress" \| "q" \| "rp" \| "rt" \| "ruby" \| "s" \| "samp" \| "search" \| "script" \| "section" \| "select" \| "small" \| "source" \| "span" \| "strong" \| "sub" \| "summary" \| "sup" \| "table" \| "template" \| "tbody" \| "td" \| "textarea" \| "tfoot" \| "th" \| "thead" \| "time" \| "tr" \| "track" \| "u" \| "ul" \| "var" \| "video" \| "wbr" \| "webview" \| "svg" \| "animate" \| "animateMotion" \| "animateTransform" \| "circle" \| "clipPath" \| "defs" \| "desc" \| "ellipse" \| "feBlend" \| "feColorMatrix" \| "feComponentTransfer" \| "feComposite" \| "feConvolveMatrix" \| "feDiffuseLighting" \| "feDisplacementMap" \| "feDistantLight" \| "feDropShadow" \| "feFlood" \| "feFuncA" \| "feFuncB" \| "feFuncG" \| "feFuncR" \| "feGaussianBlur" \| "feImage" \| "feMerge" \| "feMergeNode" \| "feMorphology" \| "feOffset" \| "fePointLight" \| "feSpecularLighting" \| "feSpotLight" \| "feTile" \| "feTurbulence" \| "filter" \| "foreignObject" \| "g" \| "image" \| "line" \| "linearGradient" \| "marker" \| "mask" \| "metadata" \| "mpath" \| "path" \| "pattern" \| "polygon" \| "polyline" \| "radialGradient" \| "rect" \| "set" \| "stop" \| "switch" \| "text" \| "textPath" \| "tspan" \| "use" \| "view" \| React.ComponentClass<any, any> \| React.FunctionComponent<any> \| undefined` |         | No       | The element to render. Default `div`; use `ul` or `ol` for a list.                                  |
| `max`      | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |         | No       | The last index that gets its own delay, so a long list does not take forever to appear. Default 12. |
| `children` | `ReactNode`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |         | Yes      |                                                                                                     |

## Success check and shimmer

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { Skeleton } from "@azmr/ui/display";
import { AnimatedCheck } from "@azmr/ui/presets";
import { useState } from "react";

export default function CheckAndShimmer() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-3">
        <AnimatedCheck key={run} size={32} className="text-success" label="Saved" />
        <span className="text-sm">Saved</span>
        <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
          Replay
        </Button>
      </div>
      <div className="flex w-72 flex-col gap-2">
        <Skeleton shimmer className="h-4 w-full" />
        <Skeleton shimmer className="h-4 w-4/5" />
        <Skeleton shimmer className="h-16 w-full" />
      </div>
    </div>
  );
}
```

`AnimatedCheck` is an SVG tick that draws itself in the current text colour (`className="text-success"`); pass `label` to make it an image with a name, otherwise it is decorative. `Skeleton shimmer` sweeps a highlight across a placeholder using `transform` only, instead of pulsing.

## CountUp

```tsx
"use client";

import { Button } from "@azmr/ui/button";
import { CountUp } from "@azmr/ui/transition";
import { useState } from "react";

export default function CountUpDemo() {
  const [revenue, setRevenue] = useState(12480);
  const [rate, setRate] = useState(0.372);
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex gap-10">
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <CountUp
            className="text-3xl font-semibold"
            value={revenue}
            locale="en-NZ"
            format={{ style: "currency", currency: "NZD" }}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Conversion</p>
          <CountUp
            className="text-3xl font-semibold"
            value={rate}
            locale="en-NZ"
            format={{ style: "percent", maximumFractionDigits: 1 }}
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setRevenue(Math.round(5000 + Math.random() * 95000));
          setRate(Math.random() * 0.6);
        }}
      >
        New numbers
      </Button>
    </div>
  );
}
```

`CountUp` counts to its new value whenever `value` changes (set `animateOnMount` to count up on first show). Format with `Intl` options (`format`, `locale`): currency, percent, decimals. Whole numbers count in whole numbers. If the value changes again mid-count, it carries on from where it is.

**Screen readers get the final value at once.** The counting itself is hidden from them, so nobody hears a stream of numbers. The digits are tabular so the width does not jitter, and under reduced motion it jumps to the value.

| Prop             | Type                                    | Default | Required | Description                                                                          |
| ---------------- | --------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| `value`          | `number`                                |         | Yes      | The number to show. When it changes, the display counts to the new value.            |
| `from`           | `number`                                |         | No       | Where to start when `animateOnMount` is on. Default 0.                               |
| `animateOnMount` | `boolean \| undefined`                  |         | No       | Count up from `from` when first shown, not only when `value` changes. Default false. |
| `duration`       | `number`                                |         | No       | Milliseconds to count over. Default 800.                                             |
| `format`         | `Intl.NumberFormatOptions \| undefined` |         | No       | `Intl.NumberFormat` options: currency, percent, decimals.                            |
| `locale`         | `string \| string[] \| undefined`       |         | No       |                                                                                      |

## Transition (page and shared-element transitions)

```tsx
import { Transition } from "@azmr/ui/transition";

<Transition name="hero">…</Transition>
```

`Transition` wraps React's `<ViewTransition>` for route changes, list changes and shared-element morphs. **That component is not in a stable React yet** (the spec expects React 19.3; React 19.2 does not have it). So `Transition` looks it up when it renders, under both its stable and experimental names, and where it is missing it renders its children and nothing else. It is safe to add today, and starts working the day you upgrade React, with no code change. It also renders nothing extra when the person prefers reduced motion. The cross-fade (opacity only) is in `styles.css`.

| Prop       | Type                           | Default | Required | Description                                                                                  |
| ---------- | ------------------------------ | ------- | -------- | -------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`                    |         | No       |                                                                                              |
| `name`     | `string`                       |         | No       | Gives the element a name, so the same name on another page or list item morphs between them. |
| `default`  | `TransitionClass \| undefined` |         | No       | The animation when none of the more specific ones below apply. `"none"` turns it off.        |
| `enter`    | `TransitionClass \| undefined` |         | No       |                                                                                              |
| `exit`     | `TransitionClass \| undefined` |         | No       |                                                                                              |
| `update`   | `TransitionClass \| undefined` |         | No       |                                                                                              |
| `share`    | `TransitionClass \| undefined` |         | No       | Used when this and another element share a `name` (the shared-element morph).                |

## useReducedMotion

```tsx
"use client";

import { useReducedMotion } from "@azmr/ui/hooks";

export default function ReducedMotionDemo() {
  const reduced = useReducedMotion();
  return (
    <p className="text-sm" aria-live="polite">
      Your system is set to <strong>{reduced ? "reduce motion" : "allow motion"}</strong>. Change it
      in your operating system's accessibility settings and this updates without a reload.
    </p>
  );
}
```

```tsx
import { useReducedMotion } from "@azmr/ui/hooks";

const reduced = useReducedMotion();
```

Whether the person has asked their system for reduced motion, kept up to date while the app is open. On the server and during hydration it is `false`, so there is no mismatch. The global CSS already handles CSS animations; use the hook for motion that JavaScript drives (a count-up, a canvas, a video) that CSS cannot reach.

## Tokens

| Token                                                                 | Value                   | Use                                             |
| --------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `--motion-duration-instant` / `fast` / `base` / `slow`                | 75 / 150 / 200 / 300 ms | Press feedback, exits, enters, larger movements |
| `--motion-ease-standard` / `emphasized` / `decelerate` / `accelerate` |                         | Moves, expressive moves, entering, leaving      |
| `--motion-stagger-step`                                               | 40 ms                   | Delay between staggered items                   |
| `--motion-duration-ambient`                                           | 1500 ms                 | Loop length of ambient effects (shimmer)        |

Under reduced motion the durations become 0.01 ms (the stagger step, 0).

## The motion library (optional)

CSS covers enters, exits and state changes. For movement that follows a gesture (dragging a row, a dropped item settling, layout changes) use the [`motion`](https://motion.dev) library through `@azmr/ui/motion`. It is optional: nothing else in `@azmr/ui` imports it, and installing `@azmr/ui` does not install it.

```bash
pnpm add motion
```

`motion` is an optional peer dependency (`^14.0.0`, tested against 14.2.0). If you import `@azmr/ui/motion` without it installed, the build fails with the usual "cannot find module" error naming `motion`.

```tsx
"use client";

import { IconButton } from "@azmr/ui/button";
import { Icon } from "@azmr/ui/icons";
import { MotionProvider, Reorder, springs } from "@azmr/ui/motion";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";

const initial = ["Write the brief", "Design the tokens", "Build the components", "Ship the docs"];

export default function ReorderDemo() {
  const [items, setItems] = useState(initial);

  // Dragging is not available to everyone, so every move also has buttons.
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target] as string, next[index] as string];
    setItems(next);
  };

  return (
    <MotionProvider features="max">
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={setItems}
        className="flex max-w-sm flex-col gap-2"
        aria-label="Tasks, in order"
      >
        {items.map((item, index) => (
          <Reorder.Item
            key={item}
            value={item}
            transition={springs.snappy}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <Icon icon={GripVertical} className="text-muted-foreground" />
            <span className="flex-1">{item}</span>
            <IconButton
              icon={<Icon icon={ArrowUp} />}
              label={`Move "${item}" up`}
              size="sm"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            />
            <IconButton
              icon={<Icon icon={ArrowDown} />}
              label={`Move "${item}" down`}
              size="sm"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </MotionProvider>
  );
}
```

Wrap the part of the app that animates in `MotionProvider`, then use `m` elements (or `Reorder`, `AnimatePresence`, `useAnimate` and the other re-exports):

```tsx
import { MotionProvider, m, springs } from "@azmr/ui/motion";

<MotionProvider>
  <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springs.gentle} />
</MotionProvider>
```

`MotionProvider` sets up two things so you do not have to:

- **Lazy features.** It uses `LazyMotion`, so the animation code loads after first render instead of sitting in your main bundle. `features="dom"` (the default) covers animation, variants, hover, tap and exit. `features="max"` adds layout animation, drag and reorder, and downloads more. Either loads on demand; the wrapper itself is about 0.5 kB.
- **Reduced motion.** It sets `reducedMotion="user"`, so every animation inside follows the system setting: movement is skipped and fades still play.

By default it is **strict**: using the full `motion.div` inside it throws, so the whole library is never pulled into your bundle by accident. Use `m.div`. Pass `strict={false}` only if you accept that.

`springs` has three presets for the `transition` prop: `gentle` (a panel gliding into place), `snappy` (a control responding) and `bouncy` (a visible overshoot, used sparingly). For plain enters and exits prefer the CSS presets above, which are cheaper and follow the motion tokens.

| Prop       | Type                          | Default | Required | Description                                                                                                                                                                             |
| ---------- | ----------------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode`                   |         | Yes      |                                                                                                                                                                                         |
| `features` | `"dom" \| "max" \| undefined` |         | No       | What the `m` components can do. `dom` (default): animation, variants, hover, tap and exit. `max` adds layout animation, drag and reorder, at a larger download. Either loads on demand. |
| `strict`   | `boolean \| undefined`        |         | No       | Forbid the full `motion` component inside (use `m`), so the whole bundle is never pulled in by accident. Default true.                                                                  |

### Drag needs a keyboard alternative

Dragging is not available to everyone. The demo gives every row up and down buttons with names such as "Move Design the tokens up", and disables them at the ends of the list. Do the same for anything you make draggable.

## Writing your own animation

Use a token for every time and easing, animate only `transform`, `opacity`, `clip-path` (or `grid-template-rows`), and the global reduced-motion rule handles the rest. If something genuinely must keep moving under reduced motion (a progress spinner, which says "still working"), mark it `data-motion="essential"`.

## Accessibility

- Nothing is announced because it animates; motion never carries meaning on its own.
- `Collapse` content is inert while closed.
- `CountUp` exposes the final value to assistive technology immediately.
- Every preset has a reduced-motion rule, checked by tests.
