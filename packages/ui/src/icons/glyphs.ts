import {
  ArrowDown as ArrowDownNode,
  ArrowLeft as ArrowLeftNode,
  ArrowRight as ArrowRightNode,
  ArrowUpDown as ArrowUpDownNode,
  ArrowUp as ArrowUpNode,
  Bell as BellNode,
  Calendar as CalendarNode,
  Check as CheckNode,
  ChevronDown as ChevronDownNode,
  ChevronLeft as ChevronLeftNode,
  ChevronRight as ChevronRightNode,
  ChevronsLeft as ChevronsLeftNode,
  ChevronsRight as ChevronsRightNode,
  ChevronsUpDown as ChevronsUpDownNode,
  ChevronUp as ChevronUpNode,
  CircleAlert as CircleAlertNode,
  CircleCheck as CircleCheckNode,
  CircleDot as CircleDotNode,
  Circle as CircleNode,
  CircleX as CircleXNode,
  Clock as ClockNode,
  Copy as CopyNode,
  Download as DownloadNode,
  Ellipsis as EllipsisNode,
  EllipsisVertical as EllipsisVerticalNode,
  ExternalLink as ExternalLinkNode,
  Eye as EyeNode,
  EyeOff as EyeOffNode,
  Funnel as FunnelNode,
  GripVertical as GripVerticalNode,
  House as HouseNode,
  Info as InfoNode,
  LoaderCircle as LoaderCircleNode,
  Lock as LockNode,
  LogOut as LogOutNode,
  Mail as MailNode,
  Menu as MenuNode,
  Minus as MinusNode,
  Monitor as MonitorNode,
  Moon as MoonNode,
  PanelLeft as PanelLeftNode,
  Paperclip as PaperclipNode,
  Pencil as PencilNode,
  Plus as PlusNode,
  RefreshCw as RefreshCwNode,
  Save as SaveNode,
  Search as SearchNode,
  Settings as SettingsNode,
  SquareCheck as SquareCheckNode,
  SquareMinus as SquareMinusNode,
  Square as SquareNode,
  Star as StarNode,
  Sun as SunNode,
  Trash2 as Trash2Node,
  TriangleAlert as TriangleAlertNode,
  Upload as UploadNode,
  User as UserNode,
  Users as UsersNode,
  X as XNode,
} from "lucide";
import { createGlyph } from "./glyph.js";

/*
 * The curated Lucide icons as glyphs: the same shapes and markup as lucide-react's icons, but
 * server-safe (see glyph.tsx). Components import their icons from here, never from lucide-react.
 * Each is marked pure so a bundler drops the ones an app does not use.
 */

export const ArrowDown = /* @__PURE__ */ createGlyph("arrow-down", ArrowDownNode);
export const ArrowLeft = /* @__PURE__ */ createGlyph("arrow-left", ArrowLeftNode);
export const ArrowRight = /* @__PURE__ */ createGlyph("arrow-right", ArrowRightNode);
export const ArrowUp = /* @__PURE__ */ createGlyph("arrow-up", ArrowUpNode);
export const ArrowUpDown = /* @__PURE__ */ createGlyph("arrow-up-down", ArrowUpDownNode);
export const Bell = /* @__PURE__ */ createGlyph("bell", BellNode);
export const Calendar = /* @__PURE__ */ createGlyph("calendar", CalendarNode);
export const Check = /* @__PURE__ */ createGlyph("check", CheckNode);
export const ChevronDown = /* @__PURE__ */ createGlyph("chevron-down", ChevronDownNode);
export const ChevronLeft = /* @__PURE__ */ createGlyph("chevron-left", ChevronLeftNode);
export const ChevronRight = /* @__PURE__ */ createGlyph("chevron-right", ChevronRightNode);
export const ChevronsLeft = /* @__PURE__ */ createGlyph("chevrons-left", ChevronsLeftNode);
export const ChevronsRight = /* @__PURE__ */ createGlyph("chevrons-right", ChevronsRightNode);
export const ChevronsUpDown = /* @__PURE__ */ createGlyph("chevrons-up-down", ChevronsUpDownNode);
export const ChevronUp = /* @__PURE__ */ createGlyph("chevron-up", ChevronUpNode);
export const Circle = /* @__PURE__ */ createGlyph("circle", CircleNode);
export const CircleAlert = /* @__PURE__ */ createGlyph("circle-alert", CircleAlertNode, [
  "alert-circle",
]);
export const CircleCheck = /* @__PURE__ */ createGlyph("circle-check", CircleCheckNode, [
  "check-circle-2",
]);
export const CircleDot = /* @__PURE__ */ createGlyph("circle-dot", CircleDotNode);
export const CircleX = /* @__PURE__ */ createGlyph("circle-x", CircleXNode, ["x-circle"]);
export const Clock = /* @__PURE__ */ createGlyph("clock", ClockNode);
export const Copy = /* @__PURE__ */ createGlyph("copy", CopyNode);
export const Download = /* @__PURE__ */ createGlyph("download", DownloadNode);
export const Ellipsis = /* @__PURE__ */ createGlyph("ellipsis", EllipsisNode, ["more-horizontal"]);
export const EllipsisVertical = /* @__PURE__ */ createGlyph(
  "ellipsis-vertical",
  EllipsisVerticalNode,
  ["more-vertical"],
);
export const ExternalLink = /* @__PURE__ */ createGlyph("external-link", ExternalLinkNode);
export const Eye = /* @__PURE__ */ createGlyph("eye", EyeNode);
export const EyeOff = /* @__PURE__ */ createGlyph("eye-off", EyeOffNode);
export const Funnel = /* @__PURE__ */ createGlyph("funnel", FunnelNode, ["filter"]);
export const GripVertical = /* @__PURE__ */ createGlyph("grip-vertical", GripVerticalNode);
export const House = /* @__PURE__ */ createGlyph("house", HouseNode, ["home"]);
export const Info = /* @__PURE__ */ createGlyph("info", InfoNode);
export const LoaderCircle = /* @__PURE__ */ createGlyph("loader-circle", LoaderCircleNode, [
  "loader-2",
]);
export const Lock = /* @__PURE__ */ createGlyph("lock", LockNode);
export const LogOut = /* @__PURE__ */ createGlyph("log-out", LogOutNode);
export const Mail = /* @__PURE__ */ createGlyph("mail", MailNode);
export const Menu = /* @__PURE__ */ createGlyph("menu", MenuNode);
export const Minus = /* @__PURE__ */ createGlyph("minus", MinusNode);
export const Monitor = /* @__PURE__ */ createGlyph("monitor", MonitorNode);
export const Moon = /* @__PURE__ */ createGlyph("moon", MoonNode);
export const PanelLeft = /* @__PURE__ */ createGlyph("panel-left", PanelLeftNode, ["sidebar"]);
export const Paperclip = /* @__PURE__ */ createGlyph("paperclip", PaperclipNode);
export const Pencil = /* @__PURE__ */ createGlyph("pencil", PencilNode);
export const Plus = /* @__PURE__ */ createGlyph("plus", PlusNode);
export const RefreshCw = /* @__PURE__ */ createGlyph("refresh-cw", RefreshCwNode);
export const Save = /* @__PURE__ */ createGlyph("save", SaveNode);
export const Search = /* @__PURE__ */ createGlyph("search", SearchNode);
export const Settings = /* @__PURE__ */ createGlyph("settings", SettingsNode);
export const Square = /* @__PURE__ */ createGlyph("square", SquareNode);
export const SquareCheck = /* @__PURE__ */ createGlyph("square-check", SquareCheckNode, [
  "check-square-2",
]);
export const SquareMinus = /* @__PURE__ */ createGlyph("square-minus", SquareMinusNode, [
  "minus-square",
]);
export const Star = /* @__PURE__ */ createGlyph("star", StarNode);
export const Sun = /* @__PURE__ */ createGlyph("sun", SunNode);
export const Trash2 = /* @__PURE__ */ createGlyph("trash", Trash2Node, ["trash-2"]);
export const TriangleAlert = /* @__PURE__ */ createGlyph("triangle-alert", TriangleAlertNode, [
  "alert-triangle",
]);
export const Upload = /* @__PURE__ */ createGlyph("upload", UploadNode);
export const User = /* @__PURE__ */ createGlyph("user", UserNode);
export const Users = /* @__PURE__ */ createGlyph("users", UsersNode);
export const X = /* @__PURE__ */ createGlyph("x", XNode);
