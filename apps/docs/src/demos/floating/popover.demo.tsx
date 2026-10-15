"use client";

import { Button } from "@azmr/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@azmr/ui/floating";
import { Input } from "@azmr/ui/input";

export default function PopoverBasic() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Rename</Button>} />
      <PopoverContent align="start">
        <PopoverTitle>Rename project</PopoverTitle>
        <PopoverDescription>Shown to everyone on the team.</PopoverDescription>
        <form className="mt-3 flex flex-col gap-3" onSubmit={(event) => event.preventDefault()}>
          <Input aria-label="Project name" defaultValue="Website relaunch" />
          <div className="flex justify-end gap-2">
            <PopoverClose render={<Button variant="ghost">Cancel</Button>} />
            <PopoverClose render={<Button type="submit">Save</Button>} />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
