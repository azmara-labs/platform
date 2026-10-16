"use client";

import { Button } from "@azmr/ui/button";
import { CountUp } from "@azmr/ui/transition";
import { useState } from "react";

export default function CountUpDemo() {
  const [revenue, setRevenue] = useState(12480);
  const [rate, setRate] = useState(0.372);
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex gap-10">
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <CountUp
            className="text-3xl font-semibold"
            value={revenue}
            locale="en-NZ"
            format={{ style: "currency", currency: "NZD" }}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Conversion</p>
          <CountUp
            className="text-3xl font-semibold"
            value={rate}
            locale="en-NZ"
            format={{ style: "percent", maximumFractionDigits: 1 }}
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setRevenue(Math.round(5000 + Math.random() * 95000));
          setRate(Math.random() * 0.6);
        }}
      >
        New numbers
      </Button>
    </div>
  );
}
