"use client";

import { buttonVariants } from "@azmr/ui/button";

// `buttonVariants` returns the button's classes as a string, so any element can look like a button.
// It lives in a client entry, so call it from a Client Component.
export default function LinkAsButton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#documentation" className={buttonVariants({ variant: "outline" })}>
        Documentation
      </a>
      <a href="#start" className={buttonVariants({ size: "lg" })}>
        Get started
      </a>
    </div>
  );
}
