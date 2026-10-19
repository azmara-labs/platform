import { describe, expect, it } from "vitest";
import {
  hasUseClientDirective,
  importsReactDom,
  relativeImports,
  resolveImport,
  serverComponentProblems,
  serverPureProblems,
} from "./dist-rules.mjs";

describe("hasUseClientDirective", () => {
  it("detects the directive, with either quote style and leading comments", () => {
    expect(hasUseClientDirective('"use client";\nexport {}')).toBe(true);
    expect(hasUseClientDirective("'use client'\nexport {}")).toBe(true);
    expect(hasUseClientDirective('// banner\n/* x */\n"use client";')).toBe(true);
  });
  it("does not match the text elsewhere in the file", () => {
    expect(hasUseClientDirective('export const a = 1;\n"use client";')).toBe(false);
    expect(hasUseClientDirective("// use client")).toBe(false);
  });
});

describe("relativeImports", () => {
  it("finds static, side-effect, re-export and dynamic imports", () => {
    const code = [
      'import { a } from "./one.js";',
      'import "./two.js";',
      'export { b } from "./three.js";',
      'const c = await import("./four.js");',
      'import x from "react";',
    ].join("\n");
    expect(relativeImports(code).sort()).toEqual(
      ["./one.js", "./three.js", "./two.js", "./four.js"].sort(),
    );
  });
});

describe("relativeImports: nested entries", () => {
  it("also finds parent-directory imports, which nested entries use to reach shared chunks", () => {
    const code = [
      'import { a } from "../chunk-ABC.js";',
      'import "../../deep.js";',
      'import x from "react";',
    ].join("\n");
    expect(relativeImports(code).sort()).toEqual(["../../deep.js", "../chunk-ABC.js"].sort());
  });
  it("ignores bare package specifiers that merely start with dots in the name", () => {
    expect(relativeImports('import x from "..not-relative";')).toEqual([]);
  });
});

describe("resolveImport", () => {
  it("resolves against the importing file's directory", () => {
    expect(resolveImport("icons/lucide.js", "../chunk-A.js")).toBe("chunk-A.js");
    expect(resolveImport("icons/lucide.js", "./sibling.js")).toBe("icons/sibling.js");
    expect(resolveImport("button.js", "./chunk-B.js")).toBe("chunk-B.js");
  });
});

describe("serverPureProblems (no React at all)", () => {
  it("accepts code without React", () => {
    expect(serverPureProblems('import { a } from "./x.js"; export const b = 1;')).toEqual([]);
  });
  it.each([
    ['import { useMemo } from "react";'],
    ['import { jsx } from "react/jsx-runtime";'],
    ['import "react-dom";'],
    ['const r = require("react");'],
    ['await import("react");'],
  ])("rejects %s", (code) => {
    expect(serverPureProblems(code).length).toBeGreaterThan(0);
  });
});

describe("serverComponentProblems: client-component libraries", () => {
  it.each([
    ['import { Check } from "lucide-react";'],
    ['export { X } from "lucide-react";'],
    ['import { Icon } from "lucide-react/dist/esm/Icon.mjs";'],
    ['const l = await import("lucide-react");'],
  ])("rejects %s", (code) => {
    expect(serverComponentProblems(code)).toEqual([
      "imports lucide-react, whose components are client components",
    ]);
  });

  it("accepts the plain lucide package (shape data, no React)", () => {
    expect(serverComponentProblems('import { Check } from "lucide";')).toEqual([]);
  });
});

describe("serverComponentProblems (stateless React only)", () => {
  it("accepts forwardRef, createElement and the JSX runtime", () => {
    const code = [
      'import { forwardRef, createElement } from "react";',
      'import { jsx, jsxs } from "react/jsx-runtime";',
      "export const A = forwardRef(() => jsx('i', {}));",
    ].join("\n");
    expect(serverComponentProblems(code)).toEqual([]);
  });

  it.each([
    ["useState", 'import { useState } from "react";'],
    ["useEffect", 'import { forwardRef, useEffect } from "react";'],
    ["useContext", 'import { useContext } from "react";'],
    ["createContext", 'import { createContext } from "react";'],
    ["useSyncExternalStore", 'import { useSyncExternalStore as u } from "react";'],
    ["Component", 'import { Component } from "react";'],
  ])("rejects %s", (name, code) => {
    const problems = serverComponentProblems(code);
    expect(problems.join(" ")).toContain(name);
  });

  it("rejects hooks reached through a namespace import", () => {
    const code = 'import * as React from "react";\nexport const f = () => React.useState(0);';
    expect(serverComponentProblems(code).join(" ")).toContain("useState");
  });

  it("rejects react-dom entirely", () => {
    expect(importsReactDom('import { createPortal } from "react-dom";')).toBe(true);
    expect(serverComponentProblems('import { createPortal } from "react-dom";').length).toBe(1);
  });

  it("does not flag a word that merely contains a hook name", () => {
    expect(
      serverComponentProblems('const useStateless = 1; import { forwardRef } from "react";'),
    ).toEqual([]);
  });
});
