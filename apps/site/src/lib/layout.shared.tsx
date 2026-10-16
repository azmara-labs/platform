import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrandMark } from "@/components/brand-logo";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <BrandMark />,
    },
    slots: {
      themeSwitch: false,
    },
  };
}
