// L2: the only place `@base-ui/react/button` is imported. Components import this module, so
// the engine can be swapped without touching them.
export {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "@base-ui/react/button";
