"use client";

import { Button } from "@azmr/ui/button";
import { useEffect, useRef, useState } from "react";

export default function ButtonLoading() {
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function save() {
    setSaving(true);
    timer.current = setTimeout(() => setSaving(false), 1500);
  }

  // While loading the button ignores clicks and keys but stays focusable, so a keyboard user
  // keeps their place.
  return (
    <Button loading={saving} loadingText="Saving" onClick={save}>
      Save changes
    </Button>
  );
}
