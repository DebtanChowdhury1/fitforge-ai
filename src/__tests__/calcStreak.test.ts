import { calcStreak } from '../lib/calcStreak';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('calcStreak', () => {
  it('returns 0 when no logs', () => {
    expect(calcStreak([])).toBe(0);
  });

  it('returns 1 for a single workout today', () => {
    expect(calcStreak([{ date: daysAgo(0) }])).toBe(1);
  });

  it('returns 1 for a single workout yesterday (today not yet logged)', () => {
    expect(calcStreak([{ date: daysAgo(1) }])).toBe(1);
  });

  it('counts consecutive days including today', () => {
    const logs = [
      { date: daysAgo(0) },
      { date: daysAgo(1) },
      { date: daysAgo(2) },
    ];
    expect(calcStreak(logs)).toBe(3);
  });

  it('stops counting at a gap', () => {
    const logs = [
      { date: daysAgo(0) },
      { date: daysAgo(1) },
      { date: daysAgo(3) }, // gap on day 2
    ];
    expect(calcStreak(logs)).toBe(2);
  });

  it('deduplicates multiple logs on the same day', () => {
    const logs = [
      { date: daysAgo(0) },
      { date: daysAgo(0) },
      { date: daysAgo(1) },
    ];
    expect(calcStreak(logs)).toBe(2);
  });

  it('returns 0 when last workout was 3+ days ago', () => {
    expect(calcStreak([{ date: daysAgo(3) }])).toBe(0);
  });
});
