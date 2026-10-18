"use client";

import { Button } from "@azmr/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardFooter,
} from "@azmr/ui/display";
import { Input } from "@azmr/ui/input";
import { Stepper } from "@azmr/ui/stepper";
import { ToggleGroup, ToggleGroupItem } from "@azmr/ui/toggle";
import { type FormEvent, useCallback, useId, useRef, useState } from "react";

const STEPS = [
  { label: "Your team", description: "Name and size" },
  { label: "Your plan", description: "Pick one" },
  { label: "Confirm" },
];

const PLANS = [
  { value: "starter", label: "Starter · $49 a month" },
  { value: "business", label: "Business · $240 a month" },
];

// A wizard keeps every answer in one place, validates a step before moving on, and moves focus to
// the new step's heading, so a keyboard or screen reader user is not left on a button that has
// just disappeared.
export default function OnboardingWizard() {
  const id = useId();
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState("");
  const [size, setSize] = useState("");
  const [plan, setPlan] = useState("starter");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const moved = useRef(false);

  // A heading that appears after the person has moved on takes focus. Each step's heading has its
  // own `key`, so it is a new element and this runs once per step, never while they type.
  const focusHeading = useCallback((node: HTMLElement | null) => {
    if (node && moved.current) node.focus();
  }, []);

  function go(to: number) {
    moved.current = true;
    setStep(to);
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (step === 0) {
      if (team.trim().length < 2) return setError("Enter a team name.");
      if (!/^[1-9]\d{0,3}$/.test(size))
        return setError("Enter how many people, as a whole number.");
    }
    setError(null);
    if (step === STEPS.length - 1) {
      moved.current = true;
      return setDone(true);
    }
    go(step + 1);
  }

  if (done) {
    return (
      <Alert variant="success" className="max-w-xl">
        <AlertTitle ref={focusHeading} tabIndex={-1}>
          {team} is ready
        </AlertTitle>
        <AlertDescription>
          {size} people on the {plan} plan. We have sent a welcome email.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      onSubmit={next}
      noValidate
      aria-label="Set up your team"
      className="flex max-w-xl flex-col gap-6"
    >
      <Stepper steps={STEPS} current={step} label="Set-up progress" />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h2
            key={step}
            ref={focusHeading}
            tabIndex={-1}
            className="m-0 text-lg font-semibold outline-none"
          >
            {STEPS[step]?.label}
          </h2>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 0 && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-team`} className="text-sm font-medium">
                  Team name
                </label>
                <Input
                  id={`${id}-team`}
                  value={team}
                  autoComplete="organization"
                  onChange={(event) => setTeam(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-size`} className="text-sm font-medium">
                  How many people?
                </label>
                <Input
                  id={`${id}-size`}
                  inputMode="numeric"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <ToggleGroup
              aria-label="Plan"
              variant="outline"
              value={[plan]}
              onValueChange={(value) => {
                // One plan is always chosen: ignore the click that would turn the last one off.
                const chosen = (value as string[])[0];
                if (chosen) setPlan(chosen);
              }}
              className="flex-col items-stretch"
            >
              {PLANS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} className="justify-start">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          {step === 2 && (
            <dl className="m-0 grid grid-cols-[8rem_1fr] gap-2 text-sm">
              <dt className="text-muted-foreground">Team</dt>
              <dd className="m-0">{team}</dd>
              <dt className="text-muted-foreground">People</dt>
              <dd className="m-0">{size}</dd>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="m-0">{plan}</dd>
            </dl>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => go(step - 1)}>
            Back
          </Button>
          <Button type="submit">{step === STEPS.length - 1 ? "Create team" : "Continue"}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
