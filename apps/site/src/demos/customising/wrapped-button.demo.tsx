"use client";

import { Button, type ButtonProps } from "@azmr/ui/button";
import { forwardRef } from "react";

/** A Button with house defaults. Whatever a caller passes, including `className` and `ref`, wins. */
const ActionButton = forwardRef<HTMLButtonElement, ButtonProps>(function ActionButton(props, ref) {
  return <Button ref={ref} variant="outline" size="sm" {...props} />;
});

export default function WrappedButton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton>Save draft</ActionButton>
      <ActionButton variant="default">Publish</ActionButton>
      <ActionButton className="rounded-full">Custom shape</ActionButton>
    </div>
  );
}
