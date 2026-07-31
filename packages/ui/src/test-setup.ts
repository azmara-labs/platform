// React 19's `act` (used directly, without @testing-library/react) checks
// this flag to know it's running inside a test environment.
// https://react.dev/warnings/react-dom-test-utils
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
