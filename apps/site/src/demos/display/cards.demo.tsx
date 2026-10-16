import { Button } from "@azmr/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@azmr/ui/display";

export default function DisplayCards() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Business plan</CardTitle>
        <CardDescription>
          <Badge variant="success">Active</Badge> Renews on 1 November
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        Up to 25 users, priority support and audit logs.
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Manage plan</Button>
        <Button size="sm" variant="ghost">
          View invoices
        </Button>
      </CardFooter>
    </Card>
  );
}
