// Shared test helpers for @azmr/ui. Not part of the published package.
export { expectNoA11yViolations, findA11yViolations } from "./a11y.js";
export { type MatchMediaMock, mockMatchMedia } from "./match-media.js";
export { prefersReducedMotion, reducedMotionQuery, withReducedMotion } from "./motion.js";
export { cleanupUi, type RenderResult, renderUi } from "./render.js";
export { expectServerSafe, renderServer } from "./ssr.js";
export { setupUser } from "./user.js";
