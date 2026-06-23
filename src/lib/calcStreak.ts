/**
 * Calculates the current consecutive-day workout streak.
 * A streak continues if the user logged a workout today or yesterday.
 * Any 2+ day gap resets the streak.
 */
export function calcStreak(logs: { date: string }[]): number {
  const dates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  if (!dates.length) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(dates[0]);
  mostRecent.setHours(0, 0, 0, 0);
  const firstGap = Math.round((today.getTime() - mostRecent.getTime()) / 86400000);

  // Streak is already broken if last workout was 2+ days ago
  if (firstGap > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    prev.setHours(0, 0, 0, 0);
    curr.setHours(0, 0, 0, 0);
    const gap = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}
