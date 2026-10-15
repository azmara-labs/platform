// L2: the only place `@base-ui/react/button` is imported. Components import this module under
// Base UI's own names, so the engine can be swapped without touching them, and so the registry
// build can point a component's import straight at `@base-ui/react/button`.
export { Button, type ButtonProps } from "@base-ui/react/button";
