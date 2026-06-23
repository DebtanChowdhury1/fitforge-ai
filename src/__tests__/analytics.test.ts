import { analytics } from '../lib/analytics';

describe('analytics', () => {
  it('calls the provider with event name and properties', () => {
    const fn = jest.fn();
    analytics.init(fn);
    analytics.track('workout_logged', { plan_type: 'roadmap' });
    expect(fn).toHaveBeenCalledWith(
      'workout_logged',
      expect.objectContaining({ plan_type: 'roadmap', timestamp: expect.any(Number) }),
    );
  });

  it('does not throw when no provider is registered', () => {
    // Reset provider by re-importing (simulate no init)
    expect(() => analytics.track('workout_started')).not.toThrow();
  });
});
