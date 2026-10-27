/** 0 (very weak) to 4 (very strong), the same scale as zxcvbn, so its result can be passed through. */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordScore;
  /** One short tip for a stronger password, such as "Add another word or two". */
  suggestion?: string;
}

/** Rates a password. Swap in zxcvbn-ts or a server check for a stronger estimate. */
export type PasswordScorer = (password: string) => PasswordStrength;

/** One rule a new password has to meet, shown in the checklist below the input. */
export interface PasswordRequirement {
  /** Stable key for the list. */
  id: string;
  /** What the rule asks for, such as "At least 12 characters". */
  label: string;
  test: (password: string) => boolean;
}

const COMMON = new Set([
  "password",
  "passw0rd",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwertyuiop",
  "letmein",
  "welcome",
  "iloveyou",
  "admin",
  "abc123",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "trustno1",
  "aotearoa",
  "kiaora",
]);

function hasRun(password: string): boolean {
  // Three or more of the same character, or three in a row ("abc", "321").
  for (let i = 2; i < password.length; i++) {
    const a = password.charCodeAt(i - 2);
    const b = password.charCodeAt(i - 1);
    const c = password.charCodeAt(i);
    if (a === b && b === c) return true;
    if (b - a === c - b && Math.abs(b - a) === 1) return true;
  }
  return false;
}

/**
 * A small default scorer that follows NCSC and NIST guidance: length counts most, a common or
 * patterned password scores low, and a mix of character types only nudges the score. It is a
 * guide, not a guarantee: for a real estimate use zxcvbn-ts (see the docs) or check the password
 * against breached-password lists on the server.
 */
export const defaultPasswordScorer: PasswordScorer = (password) => {
  if (password.length === 0) return { score: 0 };
  const lower = password.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, "");
  if (COMMON.has(lower) || COMMON.has(stripped) || COMMON.has(stripped.replace(/\d+$/, ""))) {
    return { score: 0, suggestion: "Avoid common passwords" };
  }

  const length = password.length;
  let score = length >= 20 ? 4 : length >= 16 ? 3 : length >= 12 ? 2 : length >= 8 ? 1 : 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password));
  if (kinds.length >= 3 && length >= 10) score += 1;
  if (hasRun(password)) score -= 1;
  if (new Set(password).size <= Math.ceil(length / 4)) score -= 1;

  const clamped = Math.max(0, Math.min(4, score)) as PasswordScore;
  if (clamped >= 3) return { score: clamped };
  return {
    score: clamped,
    suggestion:
      length < 12 ? "Use at least 12 characters" : "Add another word or two to make it longer",
  };
};

/** Ready-made rules for the requirement checklist. Each label can be changed. */
export const passwordRequirements = {
  minLength: (length: number, label = `At least ${length} characters`): PasswordRequirement => ({
    id: `min-length-${length}`,
    label,
    test: (password) => password.length >= length,
  }),
  lowercase: (label = "A lowercase letter"): PasswordRequirement => ({
    id: "lowercase",
    label,
    test: (password) => /\p{Ll}/u.test(password),
  }),
  uppercase: (label = "An uppercase letter"): PasswordRequirement => ({
    id: "uppercase",
    label,
    test: (password) => /\p{Lu}/u.test(password),
  }),
  number: (label = "A number"): PasswordRequirement => ({
    id: "number",
    label,
    test: (password) => /\p{N}/u.test(password),
  }),
  symbol: (label = "A symbol, such as ! or #"): PasswordRequirement => ({
    id: "symbol",
    label,
    test: (password) => /[^\p{L}\p{N}\s]/u.test(password),
  }),
} as const;
