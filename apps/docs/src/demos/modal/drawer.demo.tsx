import { Button } from "@azmr/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  type DrawerSide,
  DrawerTitle,
  DrawerTrigger,
} from "@azmr/ui/modal";

const sides: DrawerSide[] = ["right", "left", "top", "bottom"];

export default function DrawerBasic() {
  return (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <Drawer key={side} side={side}>
          <DrawerTrigger render={<Button variant="outline">From the {side}</Button>} />
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
              <DrawerDescription>
                On a touch screen, swipe toward the {side} to dismiss.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose render={<Button>Apply</Button>} />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  );
}
