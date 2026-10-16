import { Input } from "@azmr/ui/input";

export default function InputBasic() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="demo-input-email" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="demo-input-email"
        type="email"
        placeholder="aroha@example.co.nz"
        autoComplete="email"
      />
    </div>
  );
}
