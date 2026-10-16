"use client";

import { Button } from "@azmr/ui/button";
import { Input } from "@azmr/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@azmr/ui/modal";

export default function DialogBasic() {
  return (
    <Dialog>
      <DialogTrigger render={<Button>Edit profile</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Change how you appear to the rest of your team.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
          <div className="grid gap-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display name
            </label>
            <Input id="display-name" defaultValue="Aroha Ngata" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <DialogClose render={<Button type="submit">Save changes</Button>} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
