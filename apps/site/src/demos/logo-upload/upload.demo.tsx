"use client";

import { Field } from "@azmr/ui/field";
import { LogoUpload } from "@azmr/ui/logo-upload";
import { useState } from "react";

const LIMIT = 32_768;

export default function LogoUploadDemo() {
  const [logo, setLogo] = useState<string | undefined>();
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <Field
        label="Company logo"
        description="PNG, JPEG or WebP. It is shrunk in your browser to fit."
      >
        {(control) => <LogoUpload {...control} value={logo} onValueChange={setLogo} />}
      </Field>
      <p className="text-sm text-muted-foreground">
        Harbour &amp; Pine logo:{" "}
        {logo
          ? `${logo.length.toLocaleString()} of ${LIMIT.toLocaleString()} characters`
          : "none yet"}
      </p>
    </div>
  );
}
