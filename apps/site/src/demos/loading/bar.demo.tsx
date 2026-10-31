"use client";

import { Button } from "@azmr/ui/button";
import { LoadingBar } from "@azmr/ui/loading/client";
import { useState } from "react";

export default function LoadingBarDemo() {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<number | null>(null);

  function navigate() {
    setValue(null);
    setLoading(true);
    setTimeout(() => setLoading(false), 2500);
  }

  function upload() {
    setLoading(true);
    let done = 0;
    setValue(done);
    const timer = setInterval(() => {
      done += 20;
      setValue(done);
      if (done >= 100) {
        clearInterval(timer);
        setLoading(false);
      }
    }, 400);
  }

  return (
    // `absolute` keeps the demo's bar inside this frame; in an app it is fixed to the top of the page.
    <div className="relative flex gap-3 overflow-hidden rounded-md border p-6 pt-8">
      <LoadingBar loading={loading} value={value} className="absolute" />
      <Button onClick={navigate} disabled={loading}>
        Go to invoices
      </Button>
      <Button variant="outline" onClick={upload} disabled={loading}>
        Upload (known progress)
      </Button>
    </div>
  );
}
