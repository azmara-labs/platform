import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as tabler from "@tabler/icons-react";
import * as lucide from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  type MuiIconTarget,
  resolveMuiIcon,
  muiIconMap as typedMap,
  unmappedMuiIcons,
} from "./mui-map.js";

// The map is `as const` for the codemod; widen it here to look names up dynamically.
const muiIconMap: Record<string, MuiIconTarget> = typedMap;

const muiDir = join(import.meta.dirname, "..", "..", "node_modules", "@mui", "icons-material");
const muiNames = new Set(
  readdirSync(muiDir)
    .filter((f) => f.endsWith(".d.ts"))
    .map((f) => f.replace(/\.d\.ts$/, "")),
);
const pascal = (kebab: string) =>
  kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

describe("MUI icon map: data integrity (validated against the real packages)", () => {
  it("is validated against a real installation of @mui/icons-material", () => {
    expect(existsSync(muiDir)).toBe(true);
    expect(muiNames.size).toBeGreaterThan(5000);
    expect(muiNames.has("Search")).toBe(true);
  });

  it("only maps names that exist in @mui/icons-material (a typo would never match)", () => {
    const missing = Object.keys(muiIconMap).filter((name) => !muiNames.has(name));
    expect(missing).toEqual([]);
  });

  it("only points at Lucide icons that exist", () => {
    const missing = Object.entries(muiIconMap).flatMap(([mui, target]) =>
      target.lucide && !(pascal(target.lucide) in lucide) ? [`${mui} -> ${target.lucide}`] : [],
    );
    expect(missing).toEqual([]);
  });

  it("only points at Tabler icons that exist", () => {
    const missing = Object.entries(muiIconMap).flatMap(([mui, target]) =>
      target.tabler && !(target.tabler in tabler) ? [`${mui} -> ${target.tabler}`] : [],
    );
    expect(missing).toEqual([]);
  });

  it("gives every entry at least one target", () => {
    const empty = Object.entries(muiIconMap)
      .filter(([, t]) => !t.lucide && !t.tabler)
      .map(([name]) => name);
    expect(empty).toEqual([]);
  });

  it("uses MUI base names only (variants are resolved, never listed)", () => {
    const variants = Object.keys(muiIconMap).filter(
      (name) =>
        /(?:Outlined|Rounded|Sharp|TwoTone)$/.test(name) &&
        muiNames.has(name.replace(/(?:Outlined|Rounded|Sharp|TwoTone)$/, "")),
    );
    expect(variants).toEqual([]);
  });

  it("lists unmapped names that really exist, and none of them are mapped", () => {
    expect(unmappedMuiIcons.length).toBeGreaterThan(0);
    for (const name of unmappedMuiIcons) {
      expect(muiNames.has(name), `${name} is not a real MUI icon`).toBe(true);
      expect(name in muiIconMap, `${name} is both mapped and unmapped`).toBe(false);
    }
    expect(new Set(unmappedMuiIcons).size).toBe(unmappedMuiIcons.length);
  });
});

describe("MUI icon map: coverage of the common Material icons", () => {
  const common = [
    "Home",
    "Menu",
    "MoreVert",
    "MoreHoriz",
    "Close",
    "Add",
    "Remove",
    "Check",
    "CheckCircle",
    "Cancel",
    "Delete",
    "Edit",
    "Save",
    "Search",
    "FilterList",
    "Sort",
    "Refresh",
    "Settings",
    "Info",
    "Help",
    "Warning",
    "Error",
    "Visibility",
    "VisibilityOff",
    "Lock",
    "LockOpen",
    "Person",
    "PersonAdd",
    "People",
    "Group",
    "AccountCircle",
    "Logout",
    "Login",
    "Mail",
    "Email",
    "Send",
    "Phone",
    "Chat",
    "Notifications",
    "Star",
    "Favorite",
    "Share",
    "Link",
    "OpenInNew",
    "Download",
    "Upload",
    "CloudUpload",
    "Print",
    "ContentCopy",
    "Undo",
    "Redo",
    "Attachment",
    "AttachFile",
    "Image",
    "PhotoCamera",
    "Folder",
    "FolderOpen",
    "Description",
    "Dashboard",
    "BarChart",
    "PieChart",
    "TrendingUp",
    "TrendingDown",
    "Receipt",
    "Payment",
    "CreditCard",
    "AttachMoney",
    "ShoppingCart",
    "LocalShipping",
    "Label",
    "Bookmark",
    "Flag",
    "CalendarToday",
    "Event",
    "Schedule",
    "AccessTime",
    "History",
    "Place",
    "LocationOn",
    "Public",
    "Language",
    "Wifi",
    "Bolt",
    "Lightbulb",
    "LightMode",
    "DarkMode",
    "Palette",
    "Code",
    "Terminal",
    "BugReport",
    "Build",
    "Storage",
    "Security",
    "VerifiedUser",
    "VpnKey",
    "ArrowBack",
    "ArrowForward",
    "ArrowUpward",
    "ArrowDownward",
    "ChevronLeft",
    "ChevronRight",
    "ExpandMore",
    "ExpandLess",
    "KeyboardArrowDown",
    "KeyboardArrowUp",
    "KeyboardArrowLeft",
    "KeyboardArrowRight",
    "UnfoldMore",
    "FirstPage",
    "LastPage",
    "DragIndicator",
    "ZoomIn",
    "ZoomOut",
    "Fullscreen",
    "FullscreenExit",
    "RadioButtonChecked",
    "RadioButtonUnchecked",
    "CheckBox",
    "CheckBoxOutlineBlank",
    "IndeterminateCheckBox",
    "Archive",
    "Inbox",
    "Business",
    "Work",
    "Contacts",
    "PlayArrow",
    "Pause",
    "Stop",
    "VolumeUp",
    "Mic",
    "Videocam",
    "Computer",
    "Smartphone",
    "Laptop",
    "Keyboard",
    "Tune",
    "ViewList",
    "GridView",
    "TableChart",
    "ListAlt",
  ];

  it("names are real MUI icons (guards typos in this list)", () => {
    expect(common.filter((n) => !muiNames.has(n))).toEqual([]);
  });

  it("maps every one of the common icons to a Lucide icon", () => {
    const missing = common.filter((name) => !muiIconMap[name]?.lucide);
    expect(missing).toEqual([]);
  });

  it("maps at least 200 icons in total", () => {
    expect(Object.keys(muiIconMap).length).toBeGreaterThanOrEqual(200);
  });
});

describe("resolveMuiIcon", () => {
  it("resolves a base name", () => {
    expect(resolveMuiIcon("Search")).toMatchObject({ name: "Search", lucide: "search" });
  });

  it.each(["Outlined", "Rounded", "Sharp", "TwoTone"])(
    "resolves the %s variant to its base",
    (v) => {
      const resolved = resolveMuiIcon(`Search${v}`);
      expect(resolved).toMatchObject({
        name: "Search",
        variant: v.toLowerCase(),
        lucide: "search",
      });
    },
  );

  it.each([
    ["DeleteOutline", "Delete", "trash-2"],
    ["HelpOutline", "Help", "circle-help"],
    ["AddCircleOutline", "AddCircle", "circle-plus"],
    ["ErrorOutline", "Error", "circle-alert"],
    ["CheckCircleOutline", "CheckCircle", "circle-check"],
  ])(
    "resolves the legacy %s (MUI before v9) as the outlined variant of %s",
    (legacy, base, lucide) => {
      expect(resolveMuiIcon(legacy)).toMatchObject({ name: base, variant: "outlined", lucide });
    },
  );

  it("prefers an exact match over stripping a variant-like suffix", () => {
    // A real icon whose name merely ends like a variant must not be mangled.
    const exact = Object.keys(muiIconMap).find((n) => /(Outlined|Rounded|Sharp|TwoTone)$/.test(n));
    if (exact) expect(resolveMuiIcon(exact)?.name).toBe(exact);
  });

  it("returns undefined for unknown, unmapped or malformed names", () => {
    expect(resolveMuiIcon("NotAnIcon")).toBeUndefined();
    expect(resolveMuiIcon("")).toBeUndefined();
    expect(resolveMuiIcon("Outlined")).toBeUndefined();
    expect(resolveMuiIcon("constructor")).toBeUndefined();
    expect(resolveMuiIcon("__proto__")).toBeUndefined();
    expect(resolveMuiIcon(unmappedMuiIcons[0] as string)).toBeUndefined();
  });

  it("carries the Tabler name for icons Lucide does not have", () => {
    const brand = Object.entries(muiIconMap).find(([, t]) => !t.lucide && t.tabler);
    expect(brand).toBeDefined();
    const [name, target] = brand as [string, { tabler: string }];
    expect(resolveMuiIcon(name)).toMatchObject({ tabler: target.tabler });
    expect(resolveMuiIcon(name)?.lucide).toBeUndefined();
  });
});
