import type { LastReadingSnapshot } from '../types/runtime';

const RELATIVE_THRESHOLD = 0.005;
const ABSOLUTE_FLOOR = 0.01;

export function exceedsThreshold(
  newValue: number | undefined,
  last: LastReadingSnapshot | undefined
) {
  if (last === undefined || newValue === undefined) return true;
  const reference = Math.abs(last.value ?? 0);
  const delta = Math.abs(newValue - (last.value ?? 0));
  return delta >= Math.max(ABSOLUTE_FLOOR, reference * RELATIVE_THRESHOLD);
}
