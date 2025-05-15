export type HighlightToken = { text: string; fuzzy: boolean };

/** Levenshtein edit distance between two strings */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Tillåtet antal fel beroende på ordlängd.
 * Kortare ord tillåter färre stavfel.
 */
function threshold(len: number): number {
  if (len <= 3) return 1;
  if (len <= 6) return 2;
  return 3;
}

/**
 * Försöker fuzzy-matcha ett sökt namn (query) mot ett kandidatnamn.
 * Ordföljden spelar ingen roll – "Karlsson Karl" matchar "Karl Karlsson".
 *
 * Returnerar highlight-tokens (kandidatens ord, varav de "nästan-matchade"
 * markeras som fuzzy) om det är en icke-exakt matchning.
 * Returnerar null om ingen fuzzy-matchning är möjlig eller om det är
 * en exakt matchning (hanteras redan av ordinarie sökning).
 */
export function fuzzyHighlightName(
  query: string,
  candidate: string,
): { tokens: HighlightToken[] } | null {
  const qWords = query.toLowerCase().trim().split(/\s+/);
  const cWords = candidate.trim().split(/\s+/);

  const usedCandidateIdx = new Set<number>();
  const matchedCandidateIdx: { idx: number; fuzzy: boolean }[] = [];

  for (const qWord of qWords) {
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let ci = 0; ci < cWords.length; ci++) {
      if (usedCandidateIdx.has(ci)) continue;
      const dist = levenshtein(qWord, cWords[ci].toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = ci;
      }
    }

    if (bestIdx < 0) return null;

    const maxLen = Math.max(qWord.length, cWords[bestIdx].length);
    if (bestDist > threshold(maxLen)) return null;

    usedCandidateIdx.add(bestIdx);
    matchedCandidateIdx.push({ idx: bestIdx, fuzzy: bestDist > 0 });
  }

  // Inte en fuzzy-matchning om alla ord stavades exakt rätt –
  // det är en vanlig matchning som redan hanteras av exaktsökningen.
  const hasFuzzy = matchedCandidateIdx.some((m) => m.fuzzy);
  if (!hasFuzzy) return null;

  // Bygg token-array utifrån kandidatens ord
  const tokens: HighlightToken[] = [];
  cWords.forEach((word, idx) => {
    if (idx > 0) tokens.push({ text: " ", fuzzy: false });
    const matchInfo = matchedCandidateIdx.find((m) => m.idx === idx);
    tokens.push({ text: word, fuzzy: matchInfo?.fuzzy ?? false });
  });

  return { tokens };
}

/**
 * Fuzzy-matchning för vanliga textsträngar (email, adress, etc.)
 * Jämför hela strängen som ett ord.
 */
export function fuzzyHighlightText(
  query: string,
  candidate: string,
): { tokens: HighlightToken[] } | null {
  const q = query.toLowerCase().trim();
  const c = candidate.trim();
  const dist = levenshtein(q, c.toLowerCase());
  const maxLen = Math.max(q.length, c.length);

  if (dist === 0) return null; // exakt match
  if (dist > threshold(maxLen)) return null;

  return { tokens: [{ text: c, fuzzy: true }] };
}
