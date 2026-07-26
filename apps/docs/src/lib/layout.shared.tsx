import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrandMark } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <BrandMark />,
    },
    slots: {
      themeSwitch: ThemeToggle,
    },
  };
}
