// Throwaway file to validate the automated PR reviewer posts real findings.
// This PR is closed without merging once validated.
export function topThree(scores: number[]): number[] {
  // Mutates the caller's array in place via sort() - a real reviewable
  // issue that passes lint/type-check but a human (or AI) reviewer should
  // flag, since callers won't expect their input array to be reordered.
  return scores.sort((a, b) => b - a).slice(0, 3);
}
