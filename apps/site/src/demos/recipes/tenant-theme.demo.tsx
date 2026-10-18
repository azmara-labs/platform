"use client";

import { Button } from "@azmr/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@azmr/ui/display";
import { createTheme } from "@azmr/ui/theme";
import { ToggleGroup, ToggleGroupItem } from "@azmr/ui/toggle";
import { useState } from "react";

// Each tenant is one brand colour. createTheme turns it into every variable the components read,
// including text colours that stay readable on it, so a tenant cannot pick an unreadable brand.
const TENANTS = {
  kauri: { label: "Kauri Timber", primary: "#2E7D32" },
  harbour: { label: "Harbour Freight", primary: "#1E88E5" },
  sunrise: { label: "Sunrise Bakery", primary: "#FFEB3B" },
} as const;

type TenantId = keyof typeof TENANTS;

export default function TenantTheme() {
  const [tenant, setTenant] = useState<TenantId>("kauri");
  // Compute the theme from the tenant's setting, then put its variables on the element that
  // should be themed. Everything inside follows, and nothing outside changes.
  const theme = createTheme({ primary: TENANTS[tenant].primary });

  return (
    <div className="flex max-w-md flex-col gap-4">
      <ToggleGroup
        aria-label="Tenant"
        variant="outline"
        value={[tenant]}
        onValueChange={(value) => {
          const chosen = (value as string[])[0] as TenantId | undefined;
          if (chosen) setTenant(chosen);
        }}
      >
        {(Object.keys(TENANTS) as TenantId[]).map((id) => (
          <ToggleGroupItem key={id} value={id}>
            {TENANTS[id].label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div style={theme.cssVariables}>
        <Card>
          <CardHeader>
            <CardTitle>{TENANTS[tenant].label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Button>Place order</Button>
            <Badge>New</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
