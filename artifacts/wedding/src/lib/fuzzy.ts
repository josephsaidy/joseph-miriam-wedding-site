// Fuzzy name matching utilities for guest lookup

/** Normalize a name: lowercase, remove accents, strip punctuation, collapse spaces */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accent marks
    .replace(/['-]/g, " ")           // treat hyphens/apostrophes as spaces
    .replace(/[^a-z\s]/g, "")        // strip everything else
    .replace(/\s+/g, " ")            // collapse multiple spaces
    .trim();
}

/** Levenshtein edit distance between two strings */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity score 0–1 (1 = identical) */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Return all token permutations of a name (handles reversed first/last) */
function namePermutations(normalized: string): string[] {
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length <= 1) return [normalized];
  // original + reversed
  return [normalized, [...tokens].reverse().join(" ")];
}

/** Common nickname expansions (nickname → canonical) */
const NICKNAME_MAP: Record<string, string[]> = {
  joe: ["joseph"],
  jo: ["joseph"],
  mike: ["michael"],
  chris: ["christopher"],
  tony: ["anthony"],
  alex: ["alexander", "alexandra"],
  sam: ["samuel", "samantha"],
  dan: ["daniel"],
  dave: ["david"],
  liz: ["elizabeth"],
  beth: ["elizabeth"],
  kate: ["katherine", "katelyn"],
  katie: ["katherine"],
  andy: ["andrew"],
  ben: ["benjamin"],
  rob: ["robert"],
  bob: ["robert"],
  matt: ["matthew"],
  nick: ["nicholas"],
  steve: ["stephen", "steven"],
  tom: ["thomas"],
  tim: ["timothy"],
  jim: ["james"],
  jimmy: ["james"],
  mia: ["miriam"],
  mari: ["miriam"],
};

/** Expand a token with known nicknames */
function expandToken(token: string): string[] {
  return [token, ...(NICKNAME_MAP[token] ?? [])];
}

export interface MatchResult {
  guestId: string;
  fullName: string;
  score: number;
}

/** Score a single candidate against the query */
function scoreCandidate(queryNorm: string, candidateNorm: string): number {
  const queryPerms = namePermutations(queryNorm);
  const candPerms = namePermutations(candidateNorm);

  let best = 0;
  for (const q of queryPerms) {
    for (const c of candPerms) {
      best = Math.max(best, similarity(q, c));
    }
  }

  // Also try token-level nickname expansion
  const queryTokens = queryNorm.split(" ").filter(Boolean);
  const candTokens = candidateNorm.split(" ").filter(Boolean);

  for (const qt of queryTokens) {
    for (const expanded of expandToken(qt)) {
      if (expanded !== qt) {
        const expandedQuery = queryNorm.replace(qt, expanded);
        const s = similarity(expandedQuery, candidateNorm);
        best = Math.max(best, s);
      }
    }
  }

  // Partial containment bonus: if query tokens all appear in candidate
  const allTokensPresent = queryTokens.every((qt) =>
    candTokens.some((ct) => ct.startsWith(qt) || qt.startsWith(ct))
  );
  if (allTokensPresent && queryTokens.length >= 2) {
    best = Math.max(best, 0.85);
  }

  return best;
}

/**
 * Find the best matches for a guest name against a list of normalized names.
 * Returns up to `limit` matches with score above `threshold`.
 */
export function findMatches(
  query: string,
  candidates: Array<{ id: string; full_name: string; normalized_name: string }>,
  threshold = 0.72,
  limit = 3
): MatchResult[] {
  const queryNorm = normalizeName(query);

  return candidates
    .map((c) => ({
      guestId: c.id,
      fullName: c.full_name,
      score: scoreCandidate(queryNorm, c.normalized_name),
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
