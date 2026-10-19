// No components at all: verify-consumer subtracts this route's client modules (the layout's
// providers) from /server-safe's, so only what the server-safe entries add is left to check.
export default function BaselinePage() {
  return <p>Baseline</p>;
}
