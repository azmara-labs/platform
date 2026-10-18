// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configure, screen, waitFor, within } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { act, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { demos } from "./demos/registry";

// The examples are whole screens, so rendering them once and running axe (demos.test.tsx does that)
// only checks the screen as it first loads. The states that matter most are the ones a person
// reaches by doing something: an error summary, an empty result, an open dialog, a loading state, a
// new step. This drives each example into those states and runs axe in each, and checks the
// behaviour the example's page claims: where focus goes, what is announced, what is marked.

configure({
  eventWrapper: (callback) => {
    let result: ReturnType<typeof callback>;
    act(() => {
      result = callback();
    });
    return result as ReturnType<typeof callback>;
  },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let host: HTMLElement | undefined;
let root: Root | undefined;

async function mount(name: keyof typeof demos) {
  const Component = demos[name] as ComponentType;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(<Component />);
  });
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

/** axe over the whole document, so portalled dialogs and menus are included. */
async function expectAccessible(label: string) {
  const results = await axe.run(document.body, {
    // jsdom has no layout engine, so contrast is covered by the token tests. A fragment is not a page.
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  const report = results.violations
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html.slice(0, 90)).join(" | ")})`)
    .join("\n");
  expect(report, `axe in the "${label}" state`).toBe("");
}

const user = () => userEvent.setup();
const button = (name: string | RegExp) => screen.getByRole("button", { name });

describe("settings page", () => {
  it("flags every problem on submit, ties each message to its field, and focuses the first", async () => {
    await mount("examples/settings-page");
    const u = user();
    const name = screen.getByLabelText("Full name");
    await u.clear(name);
    await u.clear(screen.getByLabelText("Email"));
    await u.type(screen.getByLabelText("Email"), "aroha@");
    await u.click(button("Save changes"));

    expect(screen.getByRole("alert").textContent).toContain("2 things need fixing");
    expect(name.getAttribute("aria-invalid")).toBe("true");
    const described = document.getElementById(name.getAttribute("aria-describedby") ?? "");
    expect(described?.textContent).toBe("Enter your full name.");
    expect(document.activeElement).toBe(name);
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Website (optional)").getAttribute("aria-invalid")).toBeNull();
    await expectAccessible("settings with errors");
  });

  it("does not flag anything while typing, only on submit", async () => {
    await mount("examples/settings-page");
    const u = user();
    await u.clear(screen.getByLabelText("Email"));
    await u.type(screen.getByLabelText("Email"), "not an email");
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the busy state when valid and saving", async () => {
    await mount("examples/settings-page");
    await user().click(button("Save changes"));
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() => expect(button(/saving/i).getAttribute("aria-busy")).toBe("true"));
    await expectAccessible("settings saving");
  });

  it("groups the notification choices under a legend", async () => {
    await mount("examples/settings-page");
    const group = screen.getByRole("group", { name: "Email me about" });
    expect(within(group).getAllByRole("button")).toHaveLength(3);
  });
});

describe("data table page", () => {
  const rowNames = () =>
    screen.getAllByRole("rowheader").map((cell) => cell.textContent?.trim() ?? "");

  it("starts sorted by name, and marks only the sorted column with aria-sort", async () => {
    await mount("examples/data-table-page");
    const sorted = () =>
      screen
        .getAllByRole("columnheader")
        .filter((th) => th.hasAttribute("aria-sort"))
        .map((th) => [th.textContent?.trim(), th.getAttribute("aria-sort")]);
    expect(sorted()).toEqual([["Name", "ascending"]]);

    const u = user();
    await u.click(button("Monthly"));
    expect(sorted()).toEqual([["Monthly", "ascending"]]);
    await u.click(button("Monthly"));
    expect(sorted()).toEqual([["Monthly", "descending"]]);
    // The most expensive plans come first when descending.
    expect(rowNames()[0]).toMatch(/Hemi Te Rangi|Manu Kerr/);
    await expectAccessible("data table sorted");
  });

  it("announces the range, and moves between pages", async () => {
    await mount("examples/data-table-page");
    expect(screen.getByText("Showing 1–5 of 12 customers")).toBeTruthy();
    await user().click(button("Next page"));
    expect(screen.getByText("Showing 6–10 of 12 customers")).toBeTruthy();
    expect(rowNames()).toHaveLength(5);
  });

  it("filters, returns to the first page, and shows an empty state with a way out", async () => {
    await mount("examples/data-table-page");
    const u = user();
    await u.click(button("Next page"));
    await u.type(screen.getByLabelText("Search customers"), "aroha");
    expect(rowNames()).toEqual(["Aroha Ngata"]);
    expect(screen.getByText("Showing 1–1 of 1 customers")).toBeTruthy();

    await u.clear(screen.getByLabelText("Search customers"));
    await u.type(screen.getByLabelText("Search customers"), "zzz");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No customers match")).toBeTruthy();
    expect(screen.getByText("0 customers")).toBeTruthy();
    await expectAccessible("data table empty");

    await u.click(button("Clear search"));
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("gives every row action button its own name", async () => {
    await mount("examples/data-table-page");
    const names = screen
      .getAllByRole("button", { name: /^Actions for / })
      .map((b) => b.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(5);
  });
});

describe("dashboard shell", () => {
  it("marks one current page, and follows it in the content region", async () => {
    await mount("examples/dashboard-shell");
    const nav = screen.getByRole("navigation", { name: "Dashboard" });
    const current = () =>
      within(nav)
        .getAllByRole("link")
        .filter((a) => a.getAttribute("aria-current") === "page")
        .map((a) => a.textContent?.trim());
    expect(current()).toEqual(["Overview"]);

    await user().click(within(nav).getByRole("link", { name: "Billing" }));
    expect(current()).toEqual(["Billing"]);
    expect(screen.getByRole("region", { name: "Billing" })).toBeTruthy();
    await expectAccessible("dashboard on another page");
  });

  it("shows a loading state while refreshing, announces it, then settles", async () => {
    await mount("examples/dashboard-shell");
    await user().click(button("Refresh"));
    expect(document.querySelector("[aria-busy=true]")).not.toBeNull();
    expect(screen.getByText("Refreshing figures")).toBeTruthy();
    await expectAccessible("dashboard loading");
    await waitFor(() => expect(screen.getByText("Figures are up to date")).toBeTruthy(), {
      timeout: 3000,
    });
    expect(screen.getByText("$48,200")).toBeTruthy();
  });

  it("opens the account menu from the avatar button", async () => {
    await mount("examples/dashboard-shell");
    await user().click(button("Aroha Ngata"));
    expect(await screen.findByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    await expectAccessible("dashboard account menu open");
  });
});

describe("confirm-delete flow", () => {
  const files = () => screen.queryAllByRole("listitem").map((li) => li.textContent?.trim());

  async function startDelete(u: ReturnType<typeof user>, file: string) {
    await u.click(button(`Actions for ${file}`));
    await u.click(await screen.findByRole("menuitem", { name: "Delete…" }));
    return screen.findByRole("alertdialog");
  }

  it("asks first, naming the file, and starts focus on the safe choice", async () => {
    await mount("examples/confirm-delete-flow");
    const u = user();
    const dialog = await startDelete(u, "Team photo.png");
    expect(within(dialog).getByText("Delete “Team photo.png”?")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(button("Keep it")));
    await expectAccessible("confirm dialog open");

    // Cancelling changes nothing.
    await u.click(button("Keep it"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(files()).toHaveLength(4);
  });

  it("deletes on confirmation, and puts focus on the list because the row is gone", async () => {
    await mount("examples/confirm-delete-flow");
    const u = user();
    await startDelete(u, "Team photo.png");
    await u.click(button("Delete"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(files().some((text) => text?.includes("Team photo.png"))).toBe(false);
    expect(files()).toHaveLength(3);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("list", { name: "Files" })),
    );
    await expectAccessible("after a delete");
  });

  it("shows an empty state, with a reset, when everything is deleted", async () => {
    await mount("examples/confirm-delete-flow");
    const u = user();
    for (const file of [
      "Quarterly report.pdf",
      "Team photo.png",
      "Brand guidelines.pdf",
      "Budget 2027.xlsx",
    ]) {
      await startDelete(u, file);
      await u.click(button("Delete"));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    }
    expect(screen.getByText("No files")).toBeTruthy();
    await expectAccessible("everything deleted");
    await u.click(button("Reset the list"));
    expect(files()).toHaveLength(4);
  });
});

describe("onboarding wizard", () => {
  const stepHeading = () => document.querySelector("form h2") as HTMLElement;

  it("will not move on from a step with a problem, and says what it is", async () => {
    await mount("examples/onboarding-wizard");
    const u = user();
    await u.click(button("Continue"));
    expect(screen.getByRole("alert").textContent).toContain("Enter a team name.");
    expect(stepHeading().textContent).toBe("Your team");

    await u.type(screen.getByLabelText("Team name"), "Kauri");
    await u.type(screen.getByLabelText("How many people?"), "twelve");
    await u.click(button("Continue"));
    expect(screen.getByRole("alert").textContent).toContain("whole number");
    expect(stepHeading().textContent).toBe("Your team");
    await expectAccessible("wizard with an error");
  });

  it("moves focus to each new step's heading, going forward and back, and keeps the answers", async () => {
    await mount("examples/onboarding-wizard");
    const u = user();
    await u.type(screen.getByLabelText("Team name"), "Kauri");
    await u.type(screen.getByLabelText("How many people?"), "12");
    // Typing must not pull focus away from the field.
    expect(document.activeElement).toBe(screen.getByLabelText("How many people?"));

    await u.click(button("Continue"));
    expect(stepHeading().textContent).toBe("Your plan");
    expect(document.activeElement).toBe(stepHeading());
    expect(screen.getByRole("list", { name: "Set-up progress" })).toBeTruthy();
    expect(document.querySelector("[aria-current=step]")?.textContent).toContain("Your plan");

    await u.click(button("Back"));
    expect(stepHeading().textContent).toBe("Your team");
    expect(document.activeElement).toBe(stepHeading());
    expect((screen.getByLabelText("Team name") as HTMLInputElement).value).toBe("Kauri");
  });

  it("always keeps one plan chosen, then confirms with a summary", async () => {
    await mount("examples/onboarding-wizard");
    const u = user();
    await u.type(screen.getByLabelText("Team name"), "Kauri");
    await u.type(screen.getByLabelText("How many people?"), "12");
    await u.click(button("Continue"));

    const group = screen.getByRole("group", { name: "Plan" });
    const pressed = () =>
      within(group)
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed()).toHaveLength(1);
    await u.click(within(group).getByRole("button", { name: /Business/ }));
    expect(pressed().map((b) => b.textContent)).toEqual(["Business · $240 a month"]);
    // Pressing the chosen one again does not leave the group empty.
    await u.click(within(group).getByRole("button", { name: /Business/ }));
    expect(pressed()).toHaveLength(1);
    await expectAccessible("wizard plan step");

    await u.click(button("Continue"));
    expect(stepHeading().textContent).toBe("Confirm");
    expect(screen.getByText("business")).toBeTruthy();
    await expectAccessible("wizard confirm step");

    await u.click(button("Create team"));
    const done = screen.getByRole("status");
    expect(done.textContent).toContain("Kauri is ready");
    expect(done.textContent).toContain("12 people on the business plan");
    expect(done.contains(document.activeElement)).toBe(true);
    await expectAccessible("wizard done");
  });
});

describe("recipes", () => {
  it("form validation: one message, tied to the field, focus on the field", async () => {
    await mount("recipes/form-validation");
    const u = user();
    const email = screen.getByLabelText("Email");
    await u.type(email, "nope");
    await u.click(button("Subscribe"));
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(email.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toContain("Enter an email address");
    expect(document.activeElement).toBe(email);
    await expectAccessible("recipe with an error");

    await u.clear(email);
    await u.type(email, "aroha@example.co.nz");
    await u.click(button("Subscribe"));
    expect(email.getAttribute("aria-invalid")).toBeNull();
    expect(email.getAttribute("aria-describedby")).toBeNull();
    expect(screen.getByText("Subscribed aroha@example.co.nz.")).toBeTruthy();
  });

  it("theme per tenant: each tenant's colour is applied to its card only", async () => {
    const el = await mount("recipes/tenant-theme");
    const u = user();
    const themed = () => el.querySelector("[style]") as HTMLElement;
    const before = themed().style.getPropertyValue("--primary");
    expect(before).not.toBe("");
    await u.click(screen.getByRole("button", { name: "Harbour Freight" }));
    const after = themed().style.getPropertyValue("--primary");
    expect(after).not.toBe(before);
    // The page outside the themed card is untouched.
    expect(el.getAttribute("style")).toBeNull();
    await expectAccessible("tenant theme");
  });
});

describe("the example pages", () => {
  const dir = join(import.meta.dirname, "..", "content", "docs");
  const read = (relative: string) => readFileSync(join(dir, relative), "utf8");
  const exampleDemos = Object.keys(demos).filter((name) => name.startsWith("examples/"));

  it("has at least five examples, each on its own page, in the sidebar order", () => {
    expect(exampleDemos.length).toBeGreaterThanOrEqual(5);
    const meta = JSON.parse(read("examples/meta.json")) as { pages: string[] };
    expect(meta.pages.filter((p) => p !== "index").sort()).toEqual(
      exampleDemos.map((name) => name.replace("examples/", "")).sort(),
    );
    for (const name of exampleDemos) {
      const page = read(`${name}.mdx`);
      expect(page, name).toContain(`<Demo name="${name}" />`);
    }
  });

  it("links the examples from the index and from a component page each one is built from", () => {
    const index = read("examples/index.mdx");
    const componentPages = ["input", "table", "layout", "menu", "modal", "stepper", "toast"].map(
      (slug) => read(`components/${slug}.mdx`),
    );
    for (const name of exampleDemos) {
      const slug = name.replace("examples/", "");
      expect(index, slug).toContain(`(/docs/examples/${slug})`);
      expect(
        componentPages.some((page) => page.includes(`(/docs/examples/${slug})`)),
        `no component page links to the ${slug} example`,
      ).toBe(true);
    }
  });

  it("links each example to the component pages for what it imports", () => {
    // Used in nearly every example as plumbing, or with no component page of its own to link.
    const exempt = new Set(["button", "layout", "icons", "toggle", "display", "theme"]);
    const problems: string[] = [];
    for (const name of exampleDemos) {
      const source = readFileSync(join(import.meta.dirname, "demos", `${name}.demo.tsx`), "utf8");
      const page = read(`${name}.mdx`);
      const entries = new Set(
        [...source.matchAll(/from "@azmr\/ui\/([\w-]+)"/g)].map((m) => m[1] as string),
      );
      for (const entry of entries) {
        if (!exempt.has(entry) && !page.includes(`(/docs/components/${entry})`)) {
          problems.push(
            `${name} imports @azmr/ui/${entry} but its page does not link /docs/components/${entry}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
