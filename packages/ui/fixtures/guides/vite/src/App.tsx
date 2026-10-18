import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import { ThemeToggle } from "./theme-toggle";

export default function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold">Hello</h1>
      <label htmlFor="name" className="text-sm font-medium">
        Your name
      </label>
      <Input id="name" placeholder="Aroha" />
      <Button>Say hello</Button>
      <ThemeToggle />
    </main>
  );
}
