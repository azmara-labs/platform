// Client entry (`@azmr/ui/motion`): the optional `motion` library, set up lazily and with reduced motion
// honoured. Needs `motion` installed (an optional peer dependency); nothing else in @azmr/ui imports it.
export {
  AnimatePresence,
  animate,
  m,
  Reorder,
  useAnimate,
  useDragControls,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
export { MotionProvider, type MotionProviderProps } from "./provider.js";
export { springs } from "./springs.js";
