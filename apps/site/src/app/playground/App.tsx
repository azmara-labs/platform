"use client";

import { computed, Signal } from "@azmr/core";
import { query } from "@azmr/query";
import { useSignal } from "@azmr/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import "./playground.css";

// ── Signals (module-level — stable across renders) ─────────────────────────
const count = new Signal(0);
const doubled = computed(() => count.get() * 2);
const squared = computed(() => count.get() * count.get());

// ── Static data ────────────────────────────────────────────────────────────
const CUSTOMERS = [
  { name: "Aroha", city: "WLG", balance: 150 },
  { name: "Tane", city: "AKL", balance: 0 },
  { name: "Mere", city: "AKL", balance: 320 },
  { name: "Hemi", city: "CHC", balance: -10 },
  { name: "Rangi", city: "CHC", balance: 75 },
];

type Product = { name: string; price: number; inStock: boolean };
const DEFAULT_PRODUCTS: Product[] = [
  { name: "Widget A", price: 29.99, inStock: true },
  { name: "Widget B", price: 49.99, inStock: false },
  { name: "Widget C", price: 9.99, inStock: true },
];
const NEW_PRODUCTS: Product[] = [
  { name: "Gadget X", price: 89.99, inStock: true },
  { name: "Module Y", price: 14.99, inStock: true },
  { name: "Sensor Z", price: 199.99, inStock: false },
];

const productsSignal = new Signal<Product[]>([...DEFAULT_PRODUCTS]);
const minBalanceSignal = new Signal(0);

// ── Code snippets ──────────────────────────────────────────────────────────
const CODE_SIGNALS = `\
import { Signal, computed } from "@azmr/core";
import { useSignal } from "@azmr/ui";

// Source signal
const count = new Signal(0);

// Derived signals — update automatically
const doubled = computed(() => count.get() * 2);
const squared = computed(() => count.get() * count.get());

function Counter() {
  const value = useSignal(count);
  const dbl   = useSignal(doubled);
  const sqr   = useSignal(squared);

  return (
    <>
      <p>count:   {value}</p>
      <p>doubled: {dbl}</p>
      <p>squared: {sqr}</p>
      <button onClick={() => count.set(count.peek() + 1)}>+</button>
      <button onClick={() => count.set(count.peek() - 1)}>−</button>
      <button onClick={() => count.set(0)}>reset</button>
    </>
  );
}`;

const CODE_QUERY = `\
import { Signal } from "@azmr/core";
import { query } from "@azmr/query";

const minBalance = new Signal(0);

const customers = [
  { name: "Aroha", city: "WLG", balance: 150 },
  { name: "Tane",  city: "AKL", balance: 0   },
  { name: "Mere",  city: "AKL", balance: 320  },
  { name: "Hemi",  city: "CHC", balance: -10  },
  { name: "Rangi", city: "CHC", balance: 75   },
];

// Re-runs in render whenever minBalance signal changes
const results = query(customers)
  .where(c => c.balance >= minBalance.get())
  .orderBy((a, b) => b.balance - a.balance)
  .select();

// → filtered + sorted array, no boilerplate`;

const CODE_GRID = `\
import { Signal } from "@azmr/core";
import { useSignal } from "@azmr/ui";

type Product = { name: string; price: number; inStock: boolean };

const products = new Signal<Product[]>([
  { name: "Widget A", price: 29.99, inStock: true  },
  { name: "Widget B", price: 49.99, inStock: false },
  { name: "Widget C", price: 9.99,  inStock: true  },
]);

function ProductGrid() {
  const data = useSignal(products);

  const addProduct = () =>
    products.set([...products.peek(), newProduct]);

  const removeLast = () =>
    products.set(products.peek().slice(0, -1));

  // Grid re-renders automatically on every signal change
  return <Grid signal={products} />;
}`;

// ── Syntax highlighter ─────────────────────────────────────────────────────
const KW = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "new",
  "true",
  "false",
  "null",
  "undefined",
  "type",
  "interface",
  "extends",
  "class",
  "async",
  "await",
  "of",
  "for",
  "if",
  "else",
]);

function esc(s: string) {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

function highlight(code: string): string {
  let result = "";
  let i = 0;

  while (i < code.length) {
    // Line comment
    if (code[i] === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const text = end === -1 ? code.slice(i) : code.slice(i, end);
      result += `<span class="tok-comment">${esc(text)}</span>`;
      i += text.length;
      continue;
    }

    // String / template literal
    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const q = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== q) {
        if (code[j] === "\\") j++;
        j++;
      }
      j++;
      result += `<span class="tok-string">${esc(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Number
    // biome-ignore lint/style/noNonNullAssertion: loop bounds guarantee i < code.length
    if (/\d/.test(code[i]!) && (i === 0 || !/\w/.test(code[i - 1]!))) {
      let j = i;
      // biome-ignore lint/style/noNonNullAssertion: j < code.length checked in while condition
      while (j < code.length && /[\d.]/.test(code[j]!)) j++;
      result += `<span class="tok-num">${esc(code.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Word
    // biome-ignore lint/style/noNonNullAssertion: loop bounds guarantee i < code.length
    if (/[a-zA-Z_$]/.test(code[i]!)) {
      let j = i;
      // biome-ignore lint/style/noNonNullAssertion: j < code.length checked in while condition
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j]!)) j++;
      const word = code.slice(i, j);
      if (KW.has(word)) {
        result += `<span class="tok-kw">${esc(word)}</span>`;
      } else if (/^[A-Z]/.test(word)) {
        result += `<span class="tok-type">${esc(word)}</span>`;
      } else {
        result += esc(word);
      }
      i = j;
      continue;
    }

    // biome-ignore lint/style/noNonNullAssertion: loop bounds guarantee i < code.length
    result += esc(code[i]!);
    i++;
  }

  return result;
}

// ── CodeBlock ──────────────────────────────────────────────────────────────
function CodeBlock({ code, open }: { code: string; open: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);

  return (
    <div className={`code-section${open ? " open" : ""}`}>
      <div className="code-header">
        <span className="code-lang">typescript</span>
        <button type="button" className={`copy-btn${copied ? " copied" : ""}`} onClick={copy}>
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <pre
        className="code-pre"
        // Safe: highlight() only produces span/esc output from our own code strings
        // biome-ignore lint/security/noDangerouslySetInnerHtml: content is developer-authored, not user input
        dangerouslySetInnerHTML={{ __html: highlight(code) }}
      />
    </div>
  );
}

// ── useFlash ───────────────────────────────────────────────────────────────
function useFlash(value: unknown) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove("flash-amber", "flash-blue");
      void ref.current.offsetWidth;
      ref.current.classList.add("flash-amber");
      prev.current = value;
    }
  }, [value]);
  return ref;
}

function useFlashBlue(value: unknown) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove("flash-amber", "flash-blue");
      void ref.current.offsetWidth;
      ref.current.classList.add("flash-blue");
      prev.current = value;
    }
  }, [value]);
  return ref;
}

// ── Reactive Engine Panel ──────────────────────────────────────────────────
function SignalPanel() {
  const [showCode, setShowCode] = useState(false);
  const countVal = useSignal(count);
  const doubledVal = useSignal(doubled);
  const squaredVal = useSignal(squared);

  const countRef = useFlash(countVal);
  const doubledRef = useFlashBlue(doubledVal);
  const squaredRef = useFlashBlue(squaredVal);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-dot amber" />
          Reactive Engine
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="panel-badge">@azmr/core</span>
          <button
            type="button"
            className={`code-toggle-btn${showCode ? " active" : ""}`}
            onClick={() => setShowCode((v) => !v)}
          >
            {"</>"}
          </button>
        </div>
      </div>

      <div className="panel-body">
        <div className="signal-row">
          <span className="signal-label">signal&lt;number&gt;</span>
          <div className="signal-value-wrap">
            <span className="signal-name">count</span>
            <span className="signal-value" ref={countRef}>
              {countVal}
            </span>
          </div>
        </div>

        <div className="signal-arrow">
          <div className="arrow-line" />
          <span style={{ color: "var(--accent)", fontSize: 9, letterSpacing: "0.12em" }}>
            ↓ computed
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">computed — count × 2</span>
          <div className="signal-value-wrap">
            <span className="signal-name">doubled</span>
            <span className="signal-value computed" ref={doubledRef}>
              {doubledVal}
            </span>
          </div>
        </div>

        <div className="signal-row">
          <span className="signal-label">computed — count²</span>
          <div className="signal-value-wrap">
            <span className="signal-name">squared</span>
            <span className="signal-value computed" ref={squaredRef}>
              {squaredVal}
            </span>
          </div>
        </div>

        <div className="controls">
          <button type="button" className="btn danger" onClick={() => count.set(count.peek() - 1)}>
            −
          </button>
          <button type="button" className="btn" onClick={() => count.set(0)}>
            reset
          </button>
          <button type="button" className="btn primary" onClick={() => count.set(count.peek() + 1)}>
            +
          </button>
        </div>
      </div>

      <CodeBlock code={CODE_SIGNALS} open={showCode} />
    </div>
  );
}

// ── Query Engine Panel ─────────────────────────────────────────────────────
function QueryPanel() {
  const [showCode, setShowCode] = useState(false);
  const minBalance = useSignal(minBalanceSignal);

  const results = query(CUSTOMERS)
    .where((c) => c.balance >= minBalance)
    .orderBy((a, b) => b.balance - a.balance)
    .select();

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-dot blue" />
          Query Engine
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="panel-badge">@azmr/query</span>
          <button
            type="button"
            className={`code-toggle-btn${showCode ? " active" : ""}`}
            onClick={() => setShowCode((v) => !v)}
          >
            {"</>"}
          </button>
        </div>
      </div>

      <div className="panel-body">
        <div className="slider-row">
          <div className="slider-label-row">
            <span className="slider-label">BALANCE ≥</span>
            <span className="slider-value">${minBalance}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={350}
            step={10}
            value={minBalance}
            onChange={(e) => minBalanceSignal.set(Number(e.target.value))}
          />
        </div>

        <div className="results-meta">
          <span>
            <span className="results-count">{results.length}</span>/{CUSTOMERS.length} customers
          </span>
          <span>sorted by balance ↓</span>
        </div>

        {results.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>name</th>
                <th>city</th>
                <th>balance</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{c.city}</td>
                  <td className={c.balance < 0 ? "cell-negative" : "cell-positive"}>
                    {c.balance < 0 ? "-" : ""}${Math.abs(c.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">no results — adjust filter</div>
        )}
      </div>

      <CodeBlock code={CODE_QUERY} open={showCode} />
    </div>
  );
}

// ── Reactive Grid Panel ────────────────────────────────────────────────────
let newProductIdx = 0;

function GridPanel() {
  const [showCode, setShowCode] = useState(false);
  const products = useSignal(productsSignal);

  const addProduct = useCallback(() => {
    const next = NEW_PRODUCTS[newProductIdx % NEW_PRODUCTS.length];
    if (!next) return;
    newProductIdx++;
    productsSignal.set([...productsSignal.peek(), next]);
  }, []);

  const removeLast = useCallback(() => {
    const cur = productsSignal.peek();
    if (cur.length === 0) return;
    productsSignal.set(cur.slice(0, -1));
  }, []);

  const reset = useCallback(() => {
    newProductIdx = 0;
    productsSignal.set([...DEFAULT_PRODUCTS]);
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-dot purple" />
          Reactive Grid
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="panel-badge">{products.length} records</span>
          <button
            type="button"
            className={`code-toggle-btn${showCode ? " active" : ""}`}
            onClick={() => setShowCode((v) => !v)}
          >
            {"</>"}
          </button>
        </div>
      </div>

      <div className="panel-body">
        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-muted)" }}>
          signal&lt;Product[]&gt; → @azmr/ui Grid
        </div>

        {products.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>name</th>
                <th>price</th>
                <th>in stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: demo data has no id
                <tr key={i}>
                  <td>{p.name}</td>
                  <td style={{ color: "var(--blue)" }}>${p.price.toFixed(2)}</td>
                  <td>
                    <span className={`cell-badge ${p.inStock ? "yes" : "no"}`}>
                      {p.inStock ? "yes" : "no"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">signal is empty — add a product</div>
        )}

        <div className="controls">
          <button type="button" className="btn primary" onClick={addProduct}>
            + add
          </button>
          <button type="button" className="btn danger" onClick={removeLast}>
            − remove
          </button>
          <button type="button" className="btn" onClick={reset}>
            reset
          </button>
        </div>
      </div>

      <CodeBlock code={CODE_GRID} open={showCode} />
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export function App() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const uptime = `${String(Math.floor(tick / 60)).padStart(2, "0")}:${String(tick % 60).padStart(2, "0")}`;

  return (
    <div className="playground-root">
      <div className="app">
        <header className="header">
          <div className="header-logo">
            <div className="logo-mark" />
            <span className="logo-text">Azmara</span>
            <span className="logo-tag">playground</span>
          </div>
          <div className="header-right">
            <div className="header-status">
              <span className="status-dot" />
              live
            </div>
            <span className="header-pkg" style={{ fontFamily: "var(--mono)" }}>
              uptime {uptime}
            </span>
          </div>
        </header>

        <main className="main">
          <SignalPanel />
          <QueryPanel />
          <GridPanel />
        </main>

        <footer className="footer">
          <div className="footer-pkgs">
            {["core", "query", "ui", "db", "security", "policycore", "ai", "cli"].map((pkg) => (
              <div key={pkg} className="footer-pkg">
                <div className="footer-pkg-dot" />
                @azmr/{pkg}
              </div>
            ))}
          </div>
          <span>New Zealand · Azmara Platform</span>
        </footer>
      </div>
    </div>
  );
}
