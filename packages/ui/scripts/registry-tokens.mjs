// Builds the `tokens` registry item from src/styles/tokens.css, so the registry cannot drift from
// the package. A shadcn app already has the standard tokens (--background, --primary, ...); our
// components additionally need density, motion, elevation and a few colour tokens
// (--destructive-foreground, --success, ...). This item adds exactly those and never touches a
// standard token, so the app keeps its own palette.
import postcss from "postcss";

const STANDARD_COLOURS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

/** Names a standard shadcn (new-york, Tailwind v4) setup already defines, as variables and as theme keys. */
export const STANDARD_TOKENS = new Set([
  ...STANDARD_COLOURS,
  ...STANDARD_COLOURS.map((name) => `color-${name}`),
  "radius",
  "radius-sm",
  "radius-md",
  "radius-lg",
  "radius-xl",
]);

const bare = (prop) => prop.replace(/^--/, "");

function declsOf(container) {
  const out = new Map();
  container.each((node) => {
    if (node.type === "decl") out.set(node.prop, node.value.trim());
  });
  return out;
}

/** A postcss node's rules as the nested object the registry's `css` field uses. Comments dropped. */
function toCssObject(container) {
  const out = {};
  container.each((node) => {
    if (node.type === "decl")
      out[node.prop] = node.important ? `${node.value} !important` : node.value;
    if (node.type === "rule") out[node.selector.replace(/\s*\n\s*/g, " ")] = toCssObject(node);
    if (node.type === "atrule") {
      out[`@${node.name} ${node.params}`.trim()] = toCssObject(node);
    }
  });
  return out;
}

export function buildTokensItem(css) {
  const root = postcss.parse(css);
  const topRules = root.nodes.filter((node) => node.type === "rule");
  const find = (selector) =>
    topRules.find((rule) => rule.selectors.map((s) => s.trim()).includes(selector));

  const rootRule = find(":root");
  if (!rootRule) throw new Error("tokens.css has no :root rule");
  const lightRule = find(".light");
  const darkRule = find(".dark");
  if (!lightRule || !darkRule) throw new Error("tokens.css has no .light / .dark scope rules");

  const rootDecls = declsOf(rootRule);
  const lightDecls = declsOf(lightRule);
  const darkDecls = declsOf(darkRule);

  // Colour tokens go in cssVars (the CLI maps each to a --color-* theme entry and writes :root and
  // .dark blocks). Everything else goes in `css` as a plain :root block: the CLI self-maps any
  // non-colour cssVars key as `--x: var(--x)` inside @theme, which is a reference cycle.
  const light = {};
  const dark = {};
  const rootVars = {};
  for (const [prop, value] of rootDecls) {
    const name = bare(prop);
    if (STANDARD_TOKENS.has(name) || name === "color-scheme") continue;
    if (value.startsWith("light-dark(")) {
      // Each mode has an explicit value in its own scope block.
      const l = lightDecls.get(prop);
      const d = darkDecls.get(prop);
      if (l === undefined || d === undefined) {
        throw new Error(`${prop} has no explicit light and dark value`);
      }
      light[name] = l;
      dark[name] = d;
    } else {
      rootVars[prop] = value;
    }
  }

  // Non-colour Tailwind theme entries (ease, shadow, font); the CLI derives the colour ones.
  const theme = {};
  const themeRule = root.nodes.find((n) => n.type === "atrule" && n.name === "theme");
  if (themeRule) {
    for (const [prop, value] of declsOf(themeRule)) {
      const name = bare(prop);
      if (!STANDARD_TOKENS.has(name) && !name.startsWith("color-")) theme[name] = value;
    }
  }

  const cssOut = { ":root": rootVars };
  for (const rule of topRules) {
    if (rule.selectors.some((s) => /^\[data-density=/.test(s.trim()))) {
      cssOut[rule.selector.replace(/\s*\n\s*/g, " ")] = toCssObject(rule);
    }
  }
  const reduced = root.nodes.find(
    (n) => n.type === "atrule" && n.name === "media" && n.params.includes("prefers-reduced-motion"),
  );
  if (reduced) cssOut[`@media ${reduced.params}`] = toCssObject(reduced);

  return {
    name: "tokens",
    type: "registry:theme",
    title: "Azmara tokens",
    description:
      "The design tokens Azmara components need beyond a standard shadcn setup: density, motion, elevation and a few colours. Never overrides your existing palette.",
    cssVars: { theme, light, dark },
    css: cssOut,
  };
}
