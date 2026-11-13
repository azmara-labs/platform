import { describe, expect, it } from "vitest";
import { createTheme, type ThemeOptions } from "./create-theme.js";

// Characterisation test: the output of option sets that existed before the theme schema work.
// Recorded from the code at 8ab05c2. The schema work is additive, so these must never change.
const GOLDEN: { name: string; input: ThemeOptions; vars: string; css: string; attrs: string }[] = [
  {
    name: "{}",
    input: {},
    vars: "{}",
    css: ":root {}",
    attrs: "{}",
  },
  {
    name: '{"primary":"#1E88E5"}',
    input: { primary: "#1E88E5" },
    vars: '{"--primary":"light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9))","--primary-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--ring":"light-dark(oklch(0.6 0.167 250.9), oklch(0.7 0.159 250.9))","--sidebar-primary":"light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9))","--sidebar-primary-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--sidebar-ring":"light-dark(oklch(0.6 0.167 250.9), oklch(0.7 0.159 250.9))"}',
    css: ":root {\n  --primary: light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9));\n  --primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --ring: light-dark(oklch(0.6 0.167 250.9), oklch(0.7 0.159 250.9));\n  --sidebar-primary: light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9));\n  --sidebar-primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --sidebar-ring: light-dark(oklch(0.6 0.167 250.9), oklch(0.7 0.159 250.9));\n}",
    attrs: "{}",
  },
  {
    name: '{"primary":"#000000"}',
    input: { primary: "#000000" },
    vars: '{"--primary":"light-dark(oklch(0 0 0), oklch(0.7 0 0))","--primary-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--ring":"light-dark(oklch(0 0 0), oklch(0.7 0 0))","--sidebar-primary":"light-dark(oklch(0 0 0), oklch(0.7 0 0))","--sidebar-primary-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--sidebar-ring":"light-dark(oklch(0 0 0), oklch(0.7 0 0))"}',
    css: ":root {\n  --primary: light-dark(oklch(0 0 0), oklch(0.7 0 0));\n  --primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --ring: light-dark(oklch(0 0 0), oklch(0.7 0 0));\n  --sidebar-primary: light-dark(oklch(0 0 0), oklch(0.7 0 0));\n  --sidebar-primary-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --sidebar-ring: light-dark(oklch(0 0 0), oklch(0.7 0 0));\n}",
    attrs: "{}",
  },
  {
    name: '{"primary":"#ffffff","secondary":"#808080"}',
    input: { primary: "#ffffff", secondary: "#808080" },
    vars: '{"--secondary":"light-dark(oklch(0.6 0 0), oklch(0.7 0 0))","--secondary-foreground":"light-dark(oklch(0.145 0 0), oklch(0.145 0 0))","--primary":"light-dark(oklch(1 0 0), oklch(0.88 0 0))","--primary-foreground":"light-dark(oklch(0.145 0 0), oklch(0.145 0 0))","--ring":"light-dark(oklch(0.6 0 0), oklch(1 0 0))","--sidebar-primary":"light-dark(oklch(1 0 0), oklch(0.88 0 0))","--sidebar-primary-foreground":"light-dark(oklch(0.145 0 0), oklch(0.145 0 0))","--sidebar-ring":"light-dark(oklch(0.6 0 0), oklch(1 0 0))"}',
    css: ":root {\n  --secondary: light-dark(oklch(0.6 0 0), oklch(0.7 0 0));\n  --secondary-foreground: light-dark(oklch(0.145 0 0), oklch(0.145 0 0));\n  --primary: light-dark(oklch(1 0 0), oklch(0.88 0 0));\n  --primary-foreground: light-dark(oklch(0.145 0 0), oklch(0.145 0 0));\n  --ring: light-dark(oklch(0.6 0 0), oklch(1 0 0));\n  --sidebar-primary: light-dark(oklch(1 0 0), oklch(0.88 0 0));\n  --sidebar-primary-foreground: light-dark(oklch(0.145 0 0), oklch(0.145 0 0));\n  --sidebar-ring: light-dark(oklch(0.6 0 0), oklch(1 0 0));\n}",
    attrs: "{}",
  },
  {
    name: '{"primary":"oklch(0.9 0.15 100)","warning":"#FBC02D","success":"#2E7D32","info":"#1E88E5","destructive":"#D32F2F"}',
    input: {
      primary: "oklch(0.9 0.15 100)",
      warning: "#FBC02D",
      success: "#2E7D32",
      info: "#1E88E5",
      destructive: "#D32F2F",
    },
    vars: '{"--success":"light-dark(oklch(0.493 0.135 144.2), oklch(0.7 0.135 144.2))","--success-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--info":"light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9))","--info-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--destructive":"light-dark(oklch(0.548 0.2 26.4), oklch(0.7 0.188 26.4))","--destructive-foreground":"light-dark(oklch(0.985 0 0), oklch(0.145 0 0))","--warning":"light-dark(oklch(0.839 0.162 84.4), oklch(0.839 0.162 84.4))","--warning-foreground":"light-dark(oklch(0.25 0.04 70), oklch(0.25 0.04 70))","--warning-text":"light-dark(oklch(0.559 0.114 84.4), oklch(0.839 0.162 84.4))","--primary":"light-dark(oklch(0.9 0.15 100), oklch(0.88 0.15 100))","--primary-foreground":"light-dark(oklch(0.145 0 0), oklch(0.145 0 0))","--ring":"light-dark(oklch(0.6 0.122 100), oklch(0.9 0.15 100))","--sidebar-primary":"light-dark(oklch(0.9 0.15 100), oklch(0.88 0.15 100))","--sidebar-primary-foreground":"light-dark(oklch(0.145 0 0), oklch(0.145 0 0))","--sidebar-ring":"light-dark(oklch(0.6 0.122 100), oklch(0.9 0.15 100))"}',
    css: ":root {\n  --success: light-dark(oklch(0.493 0.135 144.2), oklch(0.7 0.135 144.2));\n  --success-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --info: light-dark(oklch(0.508 0.147 250.9), oklch(0.7 0.159 250.9));\n  --info-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --destructive: light-dark(oklch(0.548 0.2 26.4), oklch(0.7 0.188 26.4));\n  --destructive-foreground: light-dark(oklch(0.985 0 0), oklch(0.145 0 0));\n  --warning: light-dark(oklch(0.839 0.162 84.4), oklch(0.839 0.162 84.4));\n  --warning-foreground: light-dark(oklch(0.25 0.04 70), oklch(0.25 0.04 70));\n  --warning-text: light-dark(oklch(0.559 0.114 84.4), oklch(0.839 0.162 84.4));\n  --primary: light-dark(oklch(0.9 0.15 100), oklch(0.88 0.15 100));\n  --primary-foreground: light-dark(oklch(0.145 0 0), oklch(0.145 0 0));\n  --ring: light-dark(oklch(0.6 0.122 100), oklch(0.9 0.15 100));\n  --sidebar-primary: light-dark(oklch(0.9 0.15 100), oklch(0.88 0.15 100));\n  --sidebar-primary-foreground: light-dark(oklch(0.145 0 0), oklch(0.145 0 0));\n  --sidebar-ring: light-dark(oklch(0.6 0.122 100), oklch(0.9 0.15 100));\n}",
    attrs: "{}",
  },
  {
    name: '{"radius":"0.5rem","font":"Inter, sans-serif","density":"compact"}',
    input: { radius: "0.5rem", font: "Inter, sans-serif", density: "compact" },
    vars: '{"--radius":"0.5rem","--font-sans-stack":"Inter, sans-serif"}',
    css: ":root {\n  --radius: 0.5rem;\n  --font-sans-stack: Inter, sans-serif;\n}",
    attrs: '{"data-density":"compact"}',
  },
];

describe("createTheme: existing option sets keep byte-identical output", () => {
  it("covers the six recorded option sets", () => {
    expect(GOLDEN).toHaveLength(6);
  });

  it.each(GOLDEN)("keeps the output of $name byte-identical", ({ input, vars, css, attrs }) => {
    const theme = createTheme(input);
    expect(JSON.stringify(theme.cssVariables)).toBe(vars);
    expect(theme.css).toBe(css);
    expect(JSON.stringify(theme.htmlAttributes)).toBe(attrs);
  });
});
