import { Button } from "@azmr/ui/button";
import { Badge, EmptyState, Skeleton } from "@azmr/ui/display";
import { Icon } from "@azmr/ui/icons";
import { Inbox } from "lucide-react";

export default function DisplayPlaceholders() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>

      {/* Mark the loading container aria-busy; the skeleton itself is decorative. */}
      <div aria-busy="true" className="flex max-w-xs items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      <EmptyState
        icon={<Icon icon={Inbox} size="xl" />}
        title="No messages yet"
        description="When customers write to you, their messages will appear here."
        action={<Button size="sm">Compose a message</Button>}
      />
    </div>
  );
}
