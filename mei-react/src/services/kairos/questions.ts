import { FALLBACK, KNOWLEDGE } from '../../lib/kairosIntent';
import type { KnowledgeResponse } from '../../types/kairos';

export function resolveKnowledgeResponse(text: string): KnowledgeResponse {
  const lower = text.toLowerCase();
  let best: KnowledgeResponse | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE) {
    const score = entry.match.reduce(
      (acc, keyword) => acc + (lower.includes(keyword) ? (keyword.includes(' ') ? 3 : 1) : 0),
      0
    );
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return best ?? FALLBACK;
}
