import { Button } from "@azmr/ui/button";
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

export default function DialogStacked() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline">Open the first dialog</Button>} />
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Press Escape to close only the top dialog: the one underneath stays open.
          </DialogDescription>
        </DialogHeader>
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="secondary" className="justify-self-start">
                Review permissions
              </Button>
            }
          />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Permissions</DialogTitle>
              <DialogDescription>Invited people can view and comment.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button>Got it</Button>} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
